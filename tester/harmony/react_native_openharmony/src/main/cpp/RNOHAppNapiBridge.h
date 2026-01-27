/**
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

#pragma once

/**
 * @brief Notify the system that an image has been updated.
 * 
 * This function sends an "UPDATE_IMAGE_SOURCE_MAP" message to the specified
 * React Native instance.
 * 
 * @param rnInstanceId The ID of the React Native instance
 * @param remoteUri The remote URI of the image
 * @param fileUri The local file URI of the image
 */
extern "C" void onImageSourceMapUpdate(unsigned long rnInstanceId, const char* remoteUri, const char* fileUri);
