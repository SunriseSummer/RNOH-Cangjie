//
// Promise Holder for Cangjie Bridge
//

#ifndef HARMONY_PROMISEHOLDER_H
#define HARMONY_PROMISEHOLDER_H

#include <string>
#include <stdint.h>
#include "react/bridging/Bridging.h"
#include "react/bridging/Base.h"

// Value type constants for CJ_Object
const int CJ_UndefinedKind = 0;
const int CJ_NullKind = 1;
const int CJ_BooleanKind = 2;
const int CJ_NumberKind = 3;
const int CJ_SymbolKind = 4;
const int CJ_BigIntKind = 5;
const int CJ_StringKind = 6;
const int CJ_ObjectKind = 7;
const int CJ_PointerKind = 4; // Alias for SymbolKind

// Enhanced CJ_Object structure with type information
struct CJ_Object {
    void *data;
    int32_t valueKind;
};

// Bridging specialization for CJ_Object to convert Cangjie values to JavaScript values
namespace facebook::react {
template <>
struct Bridging<CJ_Object> {
    // Convert Cangjie object to JavaScript value based on its type
    static jsi::Value toJs(jsi::Runtime &runtime, const CJ_Object &obj) {
        switch (obj.valueKind) {
            case CJ_UndefinedKind:
                return jsi::Value::undefined();
            case CJ_NullKind:
                return jsi::Value::null();
            case CJ_BooleanKind:
                {
                    auto value = jsi::Value(*(bool*)(obj.data));
                    free(obj.data);
                    return value;
                }
            case CJ_NumberKind:
                {
                    auto value = jsi::Value(*(double*)(obj.data));
                    free(obj.data);
                    return value;
                }
            case CJ_StringKind:
                {
                    auto value = jsi::String::createFromUtf8(runtime, std::string((char*)(obj.data)));
                    free(obj.data);
                    return value;
                }
            case CJ_ObjectKind:
                // For object type, assume it's JSON string
                {
                    auto data = (uint8_t*)obj.data;
                    auto value = jsi::Value::createFromJsonUtf8(runtime, data, strlen((char*)data));
                    free(obj.data);
                    return value;
                }
            default:
                return jsi::Value::undefined();
        }
    }
};
}

// Template class to hold AsyncPromise shared_ptr and provide Promise resolution/rejection methods
template<typename T>
class PromiseHolder {
private:
    std::shared_ptr<facebook::react::AsyncPromise<T>> m_promise;
    
public:
    // Constructor with AsyncPromise shared_ptr
    explicit PromiseHolder(std::shared_ptr<facebook::react::AsyncPromise<T>> promise) : m_promise(promise) {}
    
    // Get the underlying AsyncPromise pointer
    facebook::react::AsyncPromise<T>* getPromise() const {
        return m_promise.get();
    }
    
    // Reject the promise with an error message
    void reject(const std::string& errorMessage) {
        if (m_promise && m_promise.get()) {
            m_promise->reject(errorMessage);
        }
    }

    // Resolve the promise with a value
    void resolve(T value) {
        m_promise->resolve(value);
    }

    // Default destructor
    ~PromiseHolder() = default;
};

// Unified C function for Promise resolution with CJ_Object
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

// C function for Promise rejection with error message
extern "C" void CJ_PromiseReject(void* promise, const char* errMsg) {
    if (promise) {
        auto rejectable = static_cast<PromiseHolder<CJ_Object>*>(promise);
        if (errMsg) {
            rejectable->reject(std::string(errMsg));
        } else {
            rejectable->reject("Unknown error");
        }
        delete rejectable;
    }
}

#endif //HARMONY_PROMISEHOLDER_H
