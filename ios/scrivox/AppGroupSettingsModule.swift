import Foundation

@objc(AppGroupSettings)
class AppGroupSettings: NSObject {
    private let suiteName = "group.com.scrivox.app"

    @objc func setValues(_ values: NSDictionary) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        for (key, value) in values {
            if let k = key as? String {
                defaults.set(value, forKey: k)
            }
        }
        defaults.synchronize()
    }

    @objc static func requiresMainQueueSetup() -> Bool { return false }
}
