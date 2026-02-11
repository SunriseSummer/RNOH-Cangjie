/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.Bridge

import std.collection.HashMap
import stdx.encoding.json.*


public type PromiseHolder = CPointer<Unit>

@C
struct CJ_Object {
    let data: CPointer<Unit>
    let valueKind: Int32
    init(data: CPointer<Unit>, valueKind: Int32) {
        this.data = data
        this.valueKind = valueKind
    }
}

let CJ_UndefinedKind = 0i32
let CJ_NullKind = 1i32
let CJ_BooleanKind = 2i32
let CJ_NumberKind = 3i32
let CJ_SymbolKind = 4i32
let CJ_PointerKind = 4i32 // Alias for SymbolKind
let CJ_BigIntKind = 5i32
let CJ_StringKind = 6i32
let CJ_ObjectKind = 7i32

foreign {
    func CJ_PromiseResolve(promise: PromiseHolder, value: CJ_Object): Unit
    func CJ_PromiseReject(promise: PromiseHolder, errMsg: CString): Unit
}

// Reject the promise with error message
public func PromiseReject(promise: PromiseHolder, errMsg: String): Unit {
    unsafe {
        let cErrMsg = LibC.mallocCString(errMsg)
        CJ_PromiseReject(promise, cErrMsg)
    }
}

// Resolve the promise with undefined
public func PromiseResolve(promise: PromiseHolder): Unit {
    unsafe {
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(), CJ_UndefinedKind))
    }
}

// Resolve the promise with boolean value
public func PromiseResolve(promise: PromiseHolder, value: Bool): Unit {
    unsafe {
        let cBoolValue = LibC.malloc<Bool>(count: 1)
        cBoolValue.write(value)
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(cBoolValue), CJ_BooleanKind))
    }
}

// Resolve the promise with string value
public func PromiseResolve(promise: PromiseHolder, value: String): Unit {
    unsafe {
        let cStringValue = LibC.mallocCString(value).getChars()
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(cStringValue), CJ_StringKind))
    }
}

// Resolve the promise with integer value
public func PromiseResolve(promise: PromiseHolder, value: Int32): Unit {
    unsafe {
        let cIntValue = LibC.malloc<Int32>(count: 1)
        cIntValue.write(value)
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(cIntValue), CJ_NumberKind))
    }
}

// Resolve the promise with double value
public func PromiseResolve(promise: PromiseHolder, value: Float64): Unit {
    unsafe {
        let cFloatValue = LibC.malloc<Float64>(count: 1)
        cFloatValue.write(value)
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(cFloatValue), CJ_NumberKind))
    }
}

// Resolve the promise with Json Object value(All keys has value)
public func PromiseResolve(promise: PromiseHolder, data: HashMap<String, String>): Unit {
    let dataJsonHashMap = HashMap<String, JsonValue>()
    for ((key, value) in data) {
        dataJsonHashMap.add(key, JsonString(value))
    }
    let jsonData = JsonObject(dataJsonHashMap).toString()
    unsafe {
        let cJsonDataString = LibC.mallocCString(jsonData).getChars()
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(cJsonDataString), CJ_ObjectKind))
    }
}

// Resolve the promise with Json Object value(Some keys has value, some keys doesn't)
public func PromiseResolve(promise: PromiseHolder, data: HashMap<String, ?String>): Unit {
    let dataJsonHashMap = HashMap<String, JsonValue>()
    for ((key, value) in data) {
        if(let Some(v) <- value) {
            dataJsonHashMap.add(key, JsonString(v))
        } else {
            dataJsonHashMap.add(key, JsonNull())
        }
    }
    let jsonData = JsonObject(dataJsonHashMap).toString()
    unsafe {
        let cJsonDataString = LibC.mallocCString(jsonData).getChars()
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(cJsonDataString), CJ_ObjectKind))
    }
}

// Resolve the promise with Json Value(source data is a JsonValue)
public func PromiseResolve(promise: PromiseHolder, data: JsonValue): Unit {
    let jsonData = data.toString()
    unsafe {
        let cJsonDataString = LibC.mallocCString(jsonData).getChars()
        CJ_PromiseResolve(promise, CJ_Object(CPointer<Unit>(cJsonDataString), CJ_ObjectKind))
    }
}
