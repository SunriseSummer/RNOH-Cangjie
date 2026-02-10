# Cangjie TurboModule CodeGen 示例

本文档汇总典型 TurboModule 接口声明及其 CodeGen 生成的核心代码片段（C++ 与 Cangjie），用于展示目前仓颉 TurboModule CodeGen 支持的能力与常见类型映射。

> 说明：以下片段为核心逻辑示意，省略了模板中的头部注释、命名空间与无关代码。

## 1. 可空同步返回（Option）

**接口声明**
```ts
export interface Spec extends TurboModule {
  getPrefetchResult(uri: string): string | undefined
}
```

**生成的 Cangjie 方法签名**
```cangjie
public func getPrefetchResult(uri: String): ?String
```

**生成的 Cangjie bridge 片段**
```cangjie
let result = module.getPrefetchResult(uriValue)
if (let Some(value) <- result) {
  let cStringValue = unsafe { LibC.mallocCString(value).getChars() }
  return CJ_Object(CPointer<Unit>(cStringValue), CJ_StringKind)
}
return CJ_Object(CPointer<Unit>(), CJ_UndefinedKind)
```

**生成的 C++ TurboModule 片段**
```cpp
auto result = SampleBridge::getPrefetchResult(uri.c_str());
return react::Bridging<CJ_Object>::toJs(rt, result);
```

## 2. Promise + 数组返回（Array<Float64>）

**接口声明**
```ts
export interface Spec extends TurboModule {
  getSize(uri: string): Promise<number[]>
}
```

**生成的 Cangjie 方法签名**
```cangjie
public func getSize(uri: String): Array<Float64>
```

**生成的 Cangjie bridge 片段**
```cangjie
let result = module.getSize(uriValue)
let resultJsonArray = JsonArray()
for (resultJsonArrayItem in result) {
  resultJsonArray.add(JsonFloat(resultJsonArrayItem))
}
PromiseResolve(promise, resultJsonArray)
```

**生成的 C++ TurboModule 片段**
```cpp
auto asyncPromise = std::make_shared<react::AsyncPromise<CJ_Object>>(rt, callInvoker);
auto promiseHolder = new PromiseHolder<CJ_Object>(asyncPromise);
SampleBridge::getSize(promiseHolder, uri.c_str());
return asyncPromise->get(rt);
```

## 3. Object 参数 / Object 返回（JSON 字符串桥接）

**接口声明**
```ts
export interface Spec extends TurboModule {
  getSizeWithHeaders(uri: string, headers: Object): Promise<Object>
}
```

**生成的 C++ 参数转换片段**
```cpp
const std::string headersJsonDefaultValue = "{}";
std::string headersJson = headersJsonDefaultValue;
if (count > 1 && args[1].isObject()) {
  auto jsonObj = rt.global().getPropertyAsObject(rt, "JSON");
  auto stringify = jsonObj.getPropertyAsFunction(rt, "stringify");
  auto jsonString = stringify.call(rt, args[1]);
  if (jsonString.isString()) {
    headersJson = jsonString.asString(rt).utf8(rt);
  }
}
```

**生成的 Cangjie 方法签名**
```cangjie
public func getSizeWithHeaders(uri: String, headers: String): String
```

**生成的 Cangjie bridge 片段**
```cangjie
let result = module.getSizeWithHeaders(uriValue, headersValue)
PromiseResolveJson(promise, result.toString())
```

## 4. Array<string> 参数（JSON → Array<String>）

**接口声明**
```ts
export interface Spec extends TurboModule {
  queryCache(uris: Array<string>): Promise<Object>
}
```

**生成的 C++ 参数转换片段**
```cpp
const std::string urisJsonDefaultValue = "[]";
std::string urisJson = urisJsonDefaultValue;
if (count > 0 && args[0].isObject()) {
  auto jsonObj = rt.global().getPropertyAsObject(rt, "JSON");
  auto stringify = jsonObj.getPropertyAsFunction(rt, "stringify");
  auto jsonString = stringify.call(rt, args[0]);
  if (jsonString.isString()) {
    urisJson = jsonString.asString(rt).utf8(rt);
  }
}
```

**生成的 Cangjie bridge 片段**
```cangjie
let urisValue = uris.toString()
let urisReader = JsonReader(ByteBuffer(unsafe { urisValue.rawData() }))
let urisArray = urisReader.readValue<Array<String>>()
let result = module.queryCache(urisArray)
PromiseResolveJson(promise, result.toString())
```

## 5. 默认参数（接口声明可直接使用 `=`）

**接口声明**
```ts
export interface Spec extends TurboModule {
  prefetchImage(uri: string, requestId: number = 0): Promise<boolean>
}
```

**生成的 C++ 参数保护片段**
```cpp
double requestId = 0.0;
if (count > 1 && args[1].isNumber()) {
  requestId = args[1].asNumber();
}
```

---

以上示例覆盖了：
- 基础类型与 Promise
- Option 可空返回
- JSON 对象参数/返回
- Array<T> 参数/返回（String / Float64）
- 默认参数语法的预处理支持

如需扩展到更复杂的结构体/嵌套数组，可继续在 Cangjie 侧自行解析 JSON 字符串或扩展 CodeGen 的类型映射逻辑。
