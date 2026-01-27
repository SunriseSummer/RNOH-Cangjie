/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

#include "ImageLoaderBridge.h"
#include <dlfcn.h>
#include "../PromiseHolder.h"

// Static callback function pointers
static GetSizeCallback g_getSizeCallback = nullptr;
static GetSizeWithHeadersCallback g_getSizeWithHeadersCallback = nullptr;
static PrefetchImageCallback g_prefetchImageCallback = nullptr;
static AbortPrefetchCallback g_abortPrefetchCallback = nullptr;
static QueryCacheCallback g_queryCacheCallback = nullptr;
static GetPrefetchResultCallback g_getPrefetchResultCallback = nullptr;

// Function pointer type for onImageSourceMapUpdate
typedef void (*OnImageSourceMapUpdateFunc)(unsigned long, const char*, const char*);

// Global function pointer to cache the loaded function
static OnImageSourceMapUpdateFunc g_onImageSourceMapUpdateFunc = nullptr;
static void* g_libHandle = nullptr;

// Helper function to load the library and function
static bool loadOnImageSourceMapUpdateFunction() {
    if (g_onImageSourceMapUpdateFunc != nullptr) {
        return true; // Already loaded
    }
    
    // Load the library dynamically
    g_libHandle = dlopen("librnoh_app.so", RTLD_LAZY);
    if (!g_libHandle) {
        return false;
    }
    
    // Get the function pointer
    g_onImageSourceMapUpdateFunc = 
        (OnImageSourceMapUpdateFunc) dlsym(g_libHandle, "onImageSourceMapUpdate");
    
    if (!g_onImageSourceMapUpdateFunc) {
        dlclose(g_libHandle);
        g_libHandle = nullptr;
        return false;
    }
    
    return true;
}

// Registration callback function implementations
extern "C" {
    void registerGetSizeCallback(GetSizeCallback callback) {
        g_getSizeCallback = callback;
    }

    void registerGetSizeWithHeadersCallback(GetSizeWithHeadersCallback callback) {
        g_getSizeWithHeadersCallback = callback;
    }

    void registerPrefetchImageCallback(PrefetchImageCallback callback) {
        g_prefetchImageCallback = callback;
        // Load the function "onImageSourceMapUpdate" from librnoh_app.so at the function regstry time
        // Save time for CJ_UpdateImageSourceMap function call
        loadOnImageSourceMapUpdateFunction();
    }

    void registerAbortPrefetchCallback(AbortPrefetchCallback callback) {
        g_abortPrefetchCallback = callback;
    }

    void registerQueryCacheCallback(QueryCacheCallback callback) {
        g_queryCacheCallback = callback;
    }

    void CJ_UpdateImageSourceMap(unsigned long rnInstanceId, char* remoteUri, char* fileUri) {
        // Load the function if not already loaded
        if (!loadOnImageSourceMapUpdateFunction()) {
            free(remoteUri);
            free(fileUri);
            return;
        }
  
        g_onImageSourceMapUpdateFunc(rnInstanceId, remoteUri, fileUri);
        free(remoteUri);
        free(fileUri);
    }

    void registerGetPrefetchResultCallback(GetPrefetchResultCallback callback) {
        g_getPrefetchResultCallback = callback;
    }
}

// Implementation of interfaces for external calls, placed in ImageLoaderBridge namespace
namespace ImageLoaderBridge {
    bool isCjImageLoaderEnabled() {
        return g_getSizeCallback != nullptr;
    }

    void getSize(void* promiseHolder, const char* uri) {
        if (g_getSizeCallback) {
            g_getSizeCallback(promiseHolder, uri);
        } else {
            CJ_PromiseReject(promiseHolder, "GetSize callback not registered");
        }
    }

    void getSizeWithHeaders(void* promiseHolder, const char* uri, const char* headers) {
        if (g_getSizeWithHeadersCallback) {
            g_getSizeWithHeadersCallback(promiseHolder, uri, headers);
        } else {
            CJ_PromiseReject(promiseHolder, "GetSizeWithHeaders callback not registered");
        }
    }

    bool prefetchImage(void* promise,unsigned long rnInstanceId, const char* uri, long long requestId) {
        if (g_prefetchImageCallback) {
            return g_prefetchImageCallback(promise, rnInstanceId, uri, requestId);
        } else {
            CJ_PromiseReject(promise, "PrefetchImage callback not registered");
            return false;
        }
    }

    void abortPrefetch(void* promiseHolder, long long requestId) {
        if (g_abortPrefetchCallback) {
            g_abortPrefetchCallback(promiseHolder, requestId);
        } else {
            CJ_PromiseReject(promiseHolder, "AbortPrefetch callback not registered");
        }
    }

    void queryCache(void* promiseHolder, const char* uri) {
        if (g_queryCacheCallback) {
            g_queryCacheCallback(promiseHolder, uri);
        } else {
            CJ_PromiseReject(promiseHolder, "QueryCache callback not registered");
        }
    }

    std::string getPrefetchResult(const char* uri) {
        if (g_getPrefetchResultCallback) {
            auto cjResult = g_getPrefetchResultCallback(uri);
            std::string result = cjResult;
            free(cjResult);
            return result;
        } else {
            return std::string();
        }
    }
}
