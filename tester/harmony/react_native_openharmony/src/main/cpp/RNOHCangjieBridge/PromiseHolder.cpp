//
// Promise Holder for Cangjie Bridge - Implementation File
//

#include "PromiseHolder.h"
#include <cstring>

// PromiseHolder template method implementations
template<typename T>
void PromiseHolder<T>::reject(const std::string& errorMessage) {
    if (m_promise && m_promise.get()) {
        m_promise->reject(errorMessage);
    }
}

template<typename T>
void PromiseHolder<T>::resolve(T value) {
    m_promise->resolve(value);
}

// Explicit instantiation for CJ_Object
template class PromiseHolder<CJ_Object>;

// C function implementations
extern "C" void CJ_PromiseResolve(void* promise, CJ_Object value) {
    if (promise) {
        auto promiseHolder = static_cast<PromiseHolder<CJ_Object>*>(promise);
        facebook::react::AsyncPromise<CJ_Object>* asyncPromise = promiseHolder->getPromise();
        if (asyncPromise) {
            asyncPromise->resolve(value);
        }
        delete promiseHolder;
    }
}

extern "C" void CJ_PromiseReject(void* promise, const char* errorMessage) {
    if (promise) {
        auto rejectable = static_cast<PromiseHolder<CJ_Object>*>(promise);
        if (errorMessage) {
            rejectable->reject(std::string(errorMessage));
        } else {
            rejectable->reject("Unknown error");
        }
        delete rejectable;
    }
}