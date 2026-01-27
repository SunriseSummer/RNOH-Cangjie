cmake_minimum_required(VERSION 3.4.1)

# Define library name - ensure the generated artifact is react_cangjie_bridge.so
set(CANGJIE_BRIDGE_LIB_NAME "react_cangjie_bridge")

# Use RNOH_CPP_DIR variable (passed from upper level CMakeLists.txt)
set(REACT_COMMON_DIR "${RNOH_CPP_DIR}/third-party/rn/ReactCommon")

# Set source files
set(CANGJIE_BRIDGE_SOURCE
    "${CMAKE_CURRENT_SOURCE_DIR}/PromiseHolder.h"
)

# Create dynamic library
add_library(${CANGJIE_BRIDGE_LIB_NAME} SHARED
    ${CANGJIE_BRIDGE_SOURCE}
)

# Set compile options
target_compile_options(${CANGJIE_BRIDGE_LIB_NAME} PRIVATE
    -Wno-error=unused-command-line-argument
    -fexceptions
    -frtti
    -Wall
    -Wextra
    -Wno-unused-parameter
    -Wno-sign-compare
    -Wno-missing-field-initializers
)

# Set C++ standard
target_compile_features(${CANGJIE_BRIDGE_LIB_NAME} PUBLIC cxx_std_17)

# Add include directories
target_include_directories(${CANGJIE_BRIDGE_LIB_NAME} PRIVATE
    ${NATIVERENDER_ROOT_PATH}
    ${NATIVERENDER_ROOT_PATH}/include
    ${REACT_COMMON_DIR}
    ${REACT_COMMON_DIR}/callinvoker
    ${REACT_COMMON_DIR}/react/bridging
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Ensure header files are processed correctly
set_target_properties(${CANGJIE_BRIDGE_LIB_NAME} PROPERTIES
    PUBLIC_HEADER "${CANGJIE_BRIDGE_HEADERS}"
)

# Link react_bridging library
target_link_libraries(${CANGJIE_BRIDGE_LIB_NAME} PRIVATE
    react_bridging
)

# Copy library file to specified directory after generation
# Create target directory (if it doesn't exist)
file(MAKE_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../../../../libs/arm64-v8a")

add_custom_command(
    TARGET ${CANGJIE_BRIDGE_LIB_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy
            $<TARGET_FILE:${CANGJIE_BRIDGE_LIB_NAME}>
            "${CMAKE_CURRENT_SOURCE_DIR}/../../../../libs/arm64-v8a/$<TARGET_FILE_NAME:${CANGJIE_BRIDGE_LIB_NAME}>"
    COMMENT "Copying ${CANGJIE_BRIDGE_LIB_NAME} to ${CMAKE_CURRENT_SOURCE_DIR}/../../../../libs/arm64-v8a/"
)

# 添加TurboModuleBridge子目录，构建独立的动态库
add_subdirectory(TurboModuleBridge)
