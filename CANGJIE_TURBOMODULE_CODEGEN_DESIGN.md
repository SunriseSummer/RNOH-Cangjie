# Cangjie TurboModule CodeGen 设计方案

## 目标

- 基于 RN TurboModule Spec 自动生成仓颉 TurboModule 模板代码。
- 复用 ImageLoader 手工实现中的桥接模式，减少重复劳动。
- 输出 **可编译的模板**，方便开发者补充类型转换和业务逻辑。

## 输入与总体流程

1. 使用 `@react-native/codegen` 解析 Spec，得到 `UberSchema`。
2. 对 `NativeModule` 模块进行遍历，提取：
   - 模块名称与方法列表
   - 参数与返回类型
   - `aliasMap` / `enumMap`
3. 通过 **类型映射表** 生成 Cangjie/FFI/C++ 侧的声明与桥接参数。
4. 通过模板生成代码文件。

当前实现位于：`react-native-harmony-cli/src/codegen-cangjie`，与现有 `codegen` 并行。

## 输出结构

以 `ImageLoader` 为例，输出目录与文件：

```
<cppOutputPath>/ImageLoaderTurboModule.h
<cppOutputPath>/ImageLoaderTurboModule.cpp
<cppBridgeOutputPath>/ImageLoaderBridge.h
<cppBridgeOutputPath>/ImageLoaderBridge.cpp
<cangjieOutputPath>/ImageLoader/ImageLoaderTurboModule.cj
<cangjieOutputPath>/ImageLoader/bridge.cj
<cangjieOutputPath>/ImageLoader/foreign.cj
<cangjieOutputPath>/ImageLoader/packageinit.cj
```

## 代码生成内容

### 1. C++ TurboModule 包装层

- 继承 `ArkTSTurboModule`，保持与现有 ArkTS 结构一致。
- 自动生成 `methodMap_` 映射。
- 对 Promise 返回方法：
  - 创建 `AsyncPromise<CJ_Object>`
  - 通过 `PromiseHolder` 传入 Cangjie 回调
- 对非 Promise 返回方法：
  - 生成调用桩并返回 `jsi::Value::undefined()`
  - 开发者可在此处扩展同步返回逻辑

### 2. C++ <-> Cangjie Bridge

- 生成 `registerXxxCallback` 与回调类型声明。
- `ImageLoaderBridge::isCjImageLoaderEnabled` 的逻辑被抽象成 `isCj<Module>Enabled`。
- 对 Promise 返回方法，在回调未注册时调用 `CJ_PromiseReject`。

### 3. Cangjie TurboModule 模板

- 生成 TurboModule 类声明、构造函数与方法签名。
- `bridge.cj` 内自动生成 `@C` 回调函数，统一处理 `PromiseResolve/PromiseReject`。
- `foreign.cj` 生成 C 侧注册函数。
- `packageinit.cj` 负责注册回调并创建模块实例。

## 类型映射策略

| JS Spec 类型 | Cangjie 方法类型 | Cangjie FFI 类型 | C++ Bridge 类型 | 备注 |
| --- | --- | --- | --- | --- |
| `string` | `String` | `CString` | `const char*` | 使用 `toString()` 转换 |
| `boolean` | `Bool` | `Bool` | `bool` | 直接透传 |
| `number` / `float` | `Int32` | `Int32` | `int32_t` | 模板默认取整，需精度时请切换为 `Float64` 并同步调整 PromiseResolve |
| `object` / `array` / `union` | `String` | `CString` | `const char*` | 默认 JSON 字符串 |
| `RootTag` | `Int32` | `Int32` | `int32_t` | 与现有 ArkTS 逻辑一致 |

说明：
- 模板优先保证 **可编译**，复杂类型需开发者补充 JSON 解析逻辑。
- 如需精确数值类型（如 `Float64`/`Int64`），在生成后手动调整即可。
- C++ 侧对 `object/array` 参数的默认占位值为 `"{}"`，用于避免空值导致的 JSON 解析错误。如需保留 `null/undefined` 语义，可在模板生成后调整默认值与判空逻辑。

## 集成步骤（需人工操作）

1. 在 `cpp/RNOHCangjieBridge/TurboModuleBridge/CMakeLists.txt` 中加入新的 `Bridge.cpp/.h` 文件。
2. 在 `main.cj` 中调用新模块的 `packageInit`。
3. 补充 Cangjie 方法内部实现与必要的类型转换。

## 可扩展方向

- 增加 Cangjie 侧 `JsonValue` 自动解析/反序列化模板。
- 为同步返回方法增加 `CJ_Object` 直返模式，减少 Promise 调用。
- 将 Cangjie CodeGen 接入 `codegen-harmony` / `codegen-lib-harmony` 命令。

---

此设计文档与当前实现保持一致，方便后续在 CLI 层集成与扩展。
