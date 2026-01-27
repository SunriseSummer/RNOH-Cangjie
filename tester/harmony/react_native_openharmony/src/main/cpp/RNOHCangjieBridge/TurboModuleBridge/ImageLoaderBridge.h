#ifndef IMAGE_LOADER_BRIDGE_H
#define IMAGE_LOADER_BRIDGE_H

#include <string>

// Callback function type definitions
typedef void (*GetSizeCallback)(void* promiseHolder, const char* uri);
typedef void (*GetSizeWithHeadersCallback)(void* promiseHolder, const char* uri, const char* headers);
typedef bool (*PrefetchImageCallback)(void* promise, unsigned long rnInstanceId, const char* uri, long long requestId);
typedef void (*AbortPrefetchCallback)(void* promiseHolder, long long requestId);
typedef char* (*QueryCacheCallback)(void* promiseHolder, const char* uri);
typedef char* (*GetPrefetchResultCallback)(const char* uri);

// Registration callback function interfaces
extern "C" {
    /* register callback function defined in bridge.cj */
    void registerGetSizeCallback(GetSizeCallback callback);
    void registerGetSizeWithHeadersCallback(GetSizeWithHeadersCallback callback);
    void registerPrefetchImageCallback(PrefetchImageCallback callback);
    void registerAbortPrefetchCallback(AbortPrefetchCallback callback);
    void registerQueryCacheCallback(QueryCacheCallback callback);
    void registerGetPrefetchResultCallback(GetPrefetchResultCallback callback);
    
    /**
     * @brief Updates the image source map for a React Native instance.
     * 
     * This function directly calls onImageSourceMapUpdate to update the image
     * source mapping for the specified React Native instance.
     * 
     * @param rnInstanceId The ID of the React Native instance, which comes from the "prefetchImage"'s `rnInstanceId` parameter
     * @param remoteUri The remote URI of the image
     * @param fileUri The local Storage URI of the image
     */
    void CJ_UpdateImageSourceMap(unsigned long rnInstanceId, char* remoteUri, char* fileUri);
}

// External interface declarations in ImageLoaderBridge namespace
namespace ImageLoaderBridge {
    bool isCjImageLoaderEnabled();
    void getSize(void* promiseHolder, const char* uri);
    void getSizeWithHeaders(void* promiseHolder, const char* uri, const char* headers);
    bool prefetchImage(void* promise, unsigned long rnInstanceId, const char* uri, long long requestId);
    void abortPrefetch(void* promiseHolder, long long requestId);
    void queryCache(void* promiseHolder, const char* uri);
    std::string getPrefetchResult(const char* uri);
}

#endif // IMAGE_LOADER_BRIDGE_H