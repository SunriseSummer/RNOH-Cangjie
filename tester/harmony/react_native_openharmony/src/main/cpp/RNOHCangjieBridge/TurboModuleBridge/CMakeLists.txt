# CMakeLists.txt for TurboModuleBridge module
# Builds libreact_cangjie_bridge_turbomodules.so dynamic library

cmake_minimum_required(VERSION 3.16)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set compile options
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra")

# Define source files for TurboModuleBridge module
set(TURBOMODULES_SOURCES
    ImageLoaderBridge.cpp
)

# Define header files for TurboModuleBridge module
set(TURBOMODULES_HEADERS
    ImageLoaderBridge.h
)

# Create shared library for TurboModuleBridge module
add_library(
    react_cangjie_bridge_turbomodules
    SHARED
    ${TURBOMODULES_SOURCES}
    ${TURBOMODULES_HEADERS}
)

# Set library properties
set_target_properties(
    react_cangjie_bridge_turbomodules
    PROPERTIES
    VERSION 1.0
    SOVERSION 1
    PUBLIC_HEADER "${TURBOMODULES_HEADERS}"
)

# Include directories - use parent variables from main CMakeLists.txt
target_include_directories(
    react_cangjie_bridge_turbomodules
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/..
    ${NATIVERENDER_ROOT_PATH}
    ${NATIVERENDER_ROOT_PATH}/include
    ${REACT_COMMON_DIR}
    ${REACT_COMMON_DIR}/callinvoker
    ${REACT_COMMON_DIR}/react/bridging
)

# Link required libraries
target_link_libraries(
    react_cangjie_bridge_turbomodules
    PRIVATE
    react_bridging
    # Add any required libraries here
    # For example: rnoh_core, folly, etc.
)

# Add compile options to suppress warnings from React Common
target_compile_options(
    react_cangjie_bridge_turbomodules
    PRIVATE
    -Wno-unused-parameter     # Suppress unused parameter warnings
    -Wno-error=unused-parameter  # Don't treat unused parameter as error
    -Wno-error=unreachable-code  # Don't treat unreachable code as error
    -Wno-error=deprecated-declarations  # Don't treat deprecated declarations as error
)

# Custom command to copy the built library to libs directory
add_custom_command(
    TARGET react_cangjie_bridge_turbomodules
    POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
            ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../libs/arm64-v8a
    COMMAND ${CMAKE_COMMAND} -E copy
            $<TARGET_FILE:react_cangjie_bridge_turbomodules>
            ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../libs/arm64-v8a/libreact_cangjie_bridge_turbomodules.so
    COMMENT "Copying libreact_cangjie_bridge_turbomodules.so to libs directory"
)

# Install rules
install(
    TARGETS react_cangjie_bridge_turbomodules
    LIBRARY DESTINATION lib
    PUBLIC_HEADER DESTINATION include
)