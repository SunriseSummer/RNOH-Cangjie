/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RNOHCorePackage.turboModules.ImageLoader


/**
 * Type alias for Promise holder used in foreign function interface
 * Represents a pointer to a Promise object that can be resolved or rejected
 */
type PromiseHolder = CPointer<Unit>

/**
 * Foreign function interface declarations for ImageLoader C++ bridge
 * These functions enable communication between Cangjie and C++ code
 * for image loading operations including size retrieval, prefetching,
 * cache querying, and request abortion.
 */
foreign {
    func registerGetSizeCallback(callback: CFunc<(PromiseHolder, CString) -> Unit>): Unit
    func registerGetSizeWithHeadersCallback(callback: CFunc<(PromiseHolder, CString, CString) -> Unit>): Unit
    func registerPrefetchImageCallback(callback: CFunc<(PromiseHolder, UInt64, CString, Int64) -> Unit>): Unit
    func registerAbortPrefetchCallback(callback: CFunc<(PromiseHolder, Int64) -> Unit>): Unit
    func registerQueryCacheCallback(callback: CFunc<(PromiseHolder, CString) -> Unit>): Unit
    func registerGetPrefetchResultCallback(callback: CFunc<(CString) -> CString>): Unit
}
