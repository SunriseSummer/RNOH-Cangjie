/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RemoteImageLoader

import reactnative_ohcj.RNOH.{RNOHContext, fetchDataFromUrl, FetchOptions, FetchResult}
import ohos.base.*
import ohos.file_fs.{File, FileFs, OpenMode}
import ohos.hilog.Hilog
import ohos.image.*
import ohos.request.agent.*
import std.collection.*
import std.collection.concurrent.*
import std.sync.*


foreign func CJ_UpdateImageSourceMap(rnInstanceId: UInt64, remoteUri: CString, fileUri: CString): Unit

public class RemoteImageLoader {
    // Key: url, Value: running "fetchDataFromUrl" task
    private let activeRequestByUrl = ConcurrentHashMap<String, Future<FetchResult>>()
    // Key: url, Value: saving file task after downloading is finished
    private let activePrefetchByUrl = ConcurrentHashMap<String, Future<Bool>>()
    // Key: requestId, Value: running download task
    public let abortPrefetchByUrl = ConcurrentHashMap<Int64, Task>()

    private let diskCache: RemoteImageDiskCache
    private let context: RNOHContext

    // Initialize RemoteImageLoader with disk cache and context
    public init(diskCache: RemoteImageDiskCache, context: RNOHContext) {
        this.diskCache = diskCache
        this.context = context
    }

    // Fetch image data from URL with optional headers
    private func fetchImage(url: String, headers!: ?HashMap<String, String> = None): FetchResult {
        if (let Some(request) <- activeRequestByUrl.get(url)) {
            return request.get()
        }

        let options = FetchOptions(headers, true)
        let future = spawn {
            fetchDataFromUrl(url, options: options)
        }
        activeRequestByUrl.add(url, future)

        let resultData = future.get()
        activeRequestByUrl.remove(url)
        return resultData
    }

    // Get image source from URI, supports data URI, cache, and remote URLs
    public func getImageSource(uri: String, headers!: ?HashMap<String, String> = None): RemoteImageSource {
        if (uri.startsWith("data:")) {
            // If the image is a data URI, create an image source from it
            let imageSource = createImageSource(uri)
            return RemoteImageSource(imageSource, "")
        }

        // If the image is being downloaded, wait until it's finished
        if (let Some(downloadTask) <- activePrefetchByUrl.get(uri)) {
            downloadTask.get()
        }

        if (this.diskCache.has(uri)) {
            let location = "file://${this.diskCache.getLocation(uri)}"
            let imageSource = createImageSource(location)
            let remoteImageSource = RemoteImageSource(imageSource, location)
            return remoteImageSource
        }

        let response = this.fetchImage(uri, headers: headers)

        let imageSource = createImageSource(String.fromUtf8(response.result.getOrThrow()))

        // NOTE: workaround for `Image` component not supporting redirects or ImageSource sources.
        // If the image is an animated GIF, we cannot convert it to a PixelMap
        // since that would display a single frame only.
        // Instead, when redirected, we attach the `location` url to the imageSource object
        // and use it as the source parameter for `Image`
        let location = response.headers.getOrThrow().get("location") ?? uri
        let remoteImageSource = RemoteImageSource(imageSource, location)

        if (!this.activePrefetchByUrl.contains(uri) && !this.diskCache.has(uri)) {
            spawn {
                // Save the image in a new thread, so other threads can know the file has been saved.
                let future = spawn {
                    this.saveFile(uri, response.result.getOrThrow())
                    true
                }
                this.activePrefetchByUrl.add(uri, future)
                future.get()
                this.activePrefetchByUrl.remove(uri)
            }
        }

        return remoteImageSource
    }

    // Save image data to file system
    private func saveFile(uri: String, arrayBuffer: Array<UInt8>): Bool {
        let path = this.diskCache.getLocation(uri)
        let file = FileFs.open(path, mode: READ_WRITE.mode | CREATE.mode)
        FileFs.write(file.fd, arrayBuffer)
        FileFs.close(file)
        this.diskCache.set(uri, true)

        return true
    }

    // Abort an ongoing prefetch request by ID
    public func abortPrefetch(requestId: Int64): Unit {
        if (let Some(request) <- this.abortPrefetchByUrl.remove(requestId)) {
            request.stop()
        }
    }

    // Prefetch image to cache for future use
    public func prefetch(rnInstanceId: UInt64, uri: String, requestId: Int64): Bool {
        if (this.diskCache.has(uri)) {
            return true
        }

        if (let Some(downloadTask) <- activePrefetchByUrl.get(uri)) {
            let result = downloadTask.get()
            return result
        }

        let result = this.downloadFile(rnInstanceId, uri, requestId)
        return result
    }

    // Perform the actual download operation using system download task
    private func performDownload(url: String, filePath: String, requestId: Int64): Bool {
        // A DownloadTask will emit the 'response' event when the download is complete,
        // so a semaphore is used to wait for the 'response' event to be emitted.
        let semp = Semaphore(1)
        semp.acquire(amount: 1)
        let downloadTask = create(
            this.context.stageContext.getOrThrow(),
            Config(
                action: Action.DOWNLOAD,
                url: url,
                saveas: filePath,
                mode: FOREGROUND,
                overwrite: true
            )
        )

        // Allow the download task to be aborted
        this.abortPrefetchByUrl.add(requestId, downloadTask)
        let respCallback = ResponseCallback(this, requestId, semp)
        let progressCallback = ProgressCallback(this, requestId, semp)
        downloadTask.on("response", respCallback)
        downloadTask.on("completed", progressCallback)
        downloadTask.on("failed", progressCallback)
        downloadTask.start()

        // Wait for the downloadTask to activate the response before executing
        semp.acquire(amount: 1)

        if(progressCallback.state) {
            return true
        } else {
            Hilog.error(0, "ImageLoader", "downloadTask failed reason is ${show(downloadTask.tid).reason}")
            return false
        }
    }

    // Download file to temporary location then move to final destination
    private func downloadFile(instanceId: UInt64, uri: String, requestId: Int64): Bool {
        let path = this.diskCache.getLocation(uri)
        let tempPath = path + "_teemp"

        // Download to a temporary location to avoid risks of corrupted files from incomplete downloads, 
        // as request.downloadFile does not clean up failed downloads automatically.
        if (FileFs.access(tempPath)) {
            FileFs.unlink(tempPath)
        }
        let downloadRes = this.performDownload(uri, tempPath, requestId)
        if(!downloadRes) {
            return false
        }
        if (FileFs.access(path)) {
            FileFs.unlink(path)
        }
        FileFs.moveFile(tempPath, path)
        this.diskCache.set(uri, true)

        let fileUri = "file://${this.diskCache.getLocation(uri)}"
        OnImageSourceMapUpdate(instanceId, uri, fileUri)
        return true
    }

    // Query cache status for given URI
    public func queryCache(uri: String): ?String {
        if (this.diskCache.has(uri)) {
            return "disk"
        }

        return None
    }

    // Get prefetch result file path or original URI
    public func getPrefetchResult(uri: String): String {
        if (this.diskCache.has(uri)) {
            return "file://${this.diskCache.getLocation(uri)}"
        }
        return ""
    }

    static func OnImageSourceMapUpdate(rnInstanceId: UInt64, remoteUri: String, fileUri: String) {
        unsafe {
            let remoteUriC = LibC.mallocCString(remoteUri)
            let fileUriC = LibC.mallocCString(fileUri)
            CJ_UpdateImageSourceMap(rnInstanceId, remoteUriC, fileUriC)
        }
    }
}

const HTTP_SUCCESS = 200i32
class ResponseCallback <: Callback1Argument<HttpResponseMessage> {
    public let loader: RemoteImageLoader
    public let requestId: Int64
    private let semp: Semaphore
    public var state = true

    // Initialize download callback with loader, request ID and semaphore
    public init(loader: RemoteImageLoader, requestId: Int64, semp: Semaphore) {
        this.loader = loader
        this.requestId = requestId
        this.semp = semp
    }

    // Handle download completion response
    // Abort the prefetch request when the download fails
    public func invoke(res: HttpResponseMessage): Unit {
        if (res.statusCode != HTTP_SUCCESS) {
            this.loader.abortPrefetchByUrl.remove(this.requestId)
            this.state = false
            Hilog.error(0, "ImageLoader", "start request failed: ${res.statusCode}")
            semp.release(amount: 1)
        }
    }
}

class ProgressCallback <: Callback1Argument<Progress> {
    public let loader: RemoteImageLoader
    public let requestId: Int64
    private let semp: Semaphore
    public var state = true

    // Initialize download callback with loader, request ID and semaphore
    public init(loader: RemoteImageLoader, requestId: Int64, semp: Semaphore) {
        this.loader = loader
        this.requestId = requestId
        this.semp = semp
    }

    public open func invoke(arg: Progress): Unit {
        match(arg.state) {
            case COMPLETED =>
                this.loader.abortPrefetchByUrl.remove(this.requestId)
                semp.release(amount: 1)
            case FAILED | REMOVED =>
                this.loader.abortPrefetchByUrl.remove(this.requestId)
                this.state = false
                semp.release(amount: 1)
                Hilog.error(0, "ImageLoader", "Download file error, down task state is ${arg.state}")
            case _ => ()
        }
    }
}
