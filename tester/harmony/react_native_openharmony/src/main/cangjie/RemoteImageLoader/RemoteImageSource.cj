/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RemoteImageLoader

import ohos.base.*
import ohos.image.*


public class RemoteImageSource {
    private let pixelMap: ?PixelMap = None
    private let imageSource: ImageSource
    private let location: String

    public init(imageSource: ImageSource, location: String) {
        this.imageSource = imageSource
        this.location = location
    }

    public func getImageSource(): ImageSource {
        return this.imageSource
    }

    public func getLocation(): String {
        return this.location
    }
}

