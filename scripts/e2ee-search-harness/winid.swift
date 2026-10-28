// Prints the CGWindowID of each on-screen window owned by the pids given as arguments (or their descendants listed by the caller).
import CoreGraphics
import Foundation

let pids = Set(CommandLine.arguments.dropFirst().compactMap { Int32($0) })
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
for w in list {
    guard let pid = w[kCGWindowOwnerPID as String] as? Int32, pids.contains(pid) else { continue }
    let id = w[kCGWindowNumber as String] as? Int ?? 0
    let layer = w[kCGWindowLayer as String] as? Int ?? -1
    let b = w[kCGWindowBounds as String] as? [String: Any] ?? [:]
    let width = b["Width"] as? Double ?? 0
    let height = b["Height"] as? Double ?? 0
    print("\(id) \(pid) \(layer) \(Int(width))x\(Int(height))")
}
