// swift-tools-version: 5.7
import PackageDescription

let package = Package(
  name: "RestTimerShared",
  platforms: [
    .iOS(.v16)
  ],
  products: [
    .library(
      name: "RestTimerShared",
      targets: ["RestTimerShared"]
    )
  ],
  targets: [
    .target(
      name: "RestTimerShared",
      path: "Sources/RestTimerShared"
    )
  ]
)
