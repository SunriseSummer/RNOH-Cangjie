/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RNOH

import ohos.ability.*
import ohos.ark_interop_helper.*


public class RNOHContext {
    public let stageContext: ?StageContext
    public let uiAbilityContext: ?UIAbilityContext
    public let cacheDir: String

    public init(stageContext!: StageContext, uiAbilityContext!: UIAbilityContext, cacheDir!: String) {
        this.stageContext = stageContext
        this.uiAbilityContext = uiAbilityContext
        this.cacheDir = cacheDir
    }
}