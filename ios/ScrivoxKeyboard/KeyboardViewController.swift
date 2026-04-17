import UIKit
import Speech

class KeyboardViewController: UIInputViewController, SFSpeechRecognizerDelegate {

    // MARK: - Properties
    private let appGroup = "group.com.scrivox.app"
    private var previewLabel: UILabel!
    private var micButton: UIButton!
    private var insertTextButton: UIButton!
    private var insertImageButton: UIButton!
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    private var isRecording = false
    private var transcribedText = ""

    private var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroup)
    }

    private var selectedFontPath: String? {
        return sharedDefaults?.string(forKey: "selectedFontPath")
    }

    private var inkColour: UIColor {
        let hex = sharedDefaults?.string(forKey: "inkColour") ?? "#1a1a1a"
        return UIColor(hex: hex) ?? .black
    }

    private var fontSize: CGFloat {
        let s = sharedDefaults?.string(forKey: "fontSize") ?? "28"
        return CGFloat(Double(s) ?? 28)
    }

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.96, green: 0.94, blue: 0.91, alpha: 1)
        setupUI()
        requestSpeechAuthorization()
    }

    // MARK: - UI Setup
    private func setupUI() {
        previewLabel = UILabel()
        previewLabel.text = "Tap 🎙️ to dictate…"
        previewLabel.font = loadHandwritingFont(size: fontSize * 0.7)
        previewLabel.textColor = inkColour
        previewLabel.numberOfLines = 2
        previewLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(previewLabel)

        micButton = UIButton(type: .system)
        micButton.setTitle("🎙️", for: .normal)
        micButton.titleLabel?.font = .systemFont(ofSize: 32)
        micButton.backgroundColor = UIColor(red: 0.55, green: 0.41, blue: 0.08, alpha: 1)
        micButton.layer.cornerRadius = 28
        micButton.translatesAutoresizingMaskIntoConstraints = false
        micButton.addTarget(self, action: #selector(micTapped), for: .touchUpInside)
        view.addSubview(micButton)

        insertTextButton = makeInsertButton(title: "Insert Text", color: UIColor(red: 0.23, green: 0.48, blue: 0.23, alpha: 1))
        insertTextButton.addTarget(self, action: #selector(insertAsText), for: .touchUpInside)
        view.addSubview(insertTextButton)

        insertImageButton = makeInsertButton(title: "Insert Image", color: UIColor(red: 0.23, green: 0.35, blue: 0.65, alpha: 1))
        insertImageButton.addTarget(self, action: #selector(insertAsImage), for: .touchUpInside)
        view.addSubview(insertImageButton)

        setupConstraints()
    }

    private func makeInsertButton(title: String, color: UIColor) -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle(title, for: .normal)
        btn.setTitleColor(.white, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
        btn.backgroundColor = color
        btn.layer.cornerRadius = 14
        btn.translatesAutoresizingMaskIntoConstraints = false
        return btn
    }

    private func setupConstraints() {
        NSLayoutConstraint.activate([
            previewLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            previewLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 14),
            previewLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
            previewLabel.heightAnchor.constraint(equalToConstant: 52),

            micButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            micButton.topAnchor.constraint(equalTo: previewLabel.bottomAnchor, constant: 10),
            micButton.widthAnchor.constraint(equalToConstant: 56),
            micButton.heightAnchor.constraint(equalToConstant: 56),

            insertTextButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -10),
            insertTextButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 14),
            insertTextButton.widthAnchor.constraint(equalToConstant: 130),
            insertTextButton.heightAnchor.constraint(equalToConstant: 36),

            insertImageButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -10),
            insertImageButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
            insertImageButton.widthAnchor.constraint(equalToConstant: 130),
            insertImageButton.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    // MARK: - Font Loading
    private func loadHandwritingFont(size: CGFloat) -> UIFont {
        guard let path = selectedFontPath, !path.isEmpty else {
            return UIFont(name: "Georgia-Italic", size: size) ?? .systemFont(ofSize: size)
        }
        let url = URL(fileURLWithPath: path)
        guard let data = try? Data(contentsOf: url) as CFData,
              let provider = CGDataProvider(data: data),
              let cgFont = CGFont(provider) else {
            return .systemFont(ofSize: size)
        }
        CTFontManagerRegisterGraphicsFont(cgFont, nil)
        if let name = cgFont.postScriptName as String? {
            return UIFont(name: name, size: size) ?? .systemFont(ofSize: size)
        }
        return .systemFont(ofSize: size)
    }

    // MARK: - Speech
    private func requestSpeechAuthorization() {
        SFSpeechRecognizer.requestAuthorization { _ in }
    }

    @objc private func micTapped() {
        isRecording ? stopRecording() : startRecording()
    }

    private func startRecording() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale.current)
        speechRecognizer?.delegate = self
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let request = recognitionRequest else { return }
        request.shouldReportPartialResults = true

        let node = audioEngine.inputNode
        recognitionTask = speechRecognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                self.transcribedText = result.bestTranscription.formattedString
                DispatchQueue.main.async {
                    self.previewLabel.text = self.transcribedText
                    self.previewLabel.font = self.loadHandwritingFont(size: self.fontSize * 0.7)
                    self.previewLabel.textColor = self.inkColour
                }
            }
            if error != nil || result?.isFinal == true { self.stopRecording() }
        }

        let format = node.outputFormat(forBus: 0)
        node.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        try? audioEngine.start()
        isRecording = true
        micButton.backgroundColor = UIColor(red: 0.75, green: 0.24, blue: 0.17, alpha: 1)
    }

    private func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        isRecording = false
        micButton.backgroundColor = UIColor(red: 0.55, green: 0.41, blue: 0.08, alpha: 1)
    }

    // MARK: - Insert
    @objc private func insertAsText() {
        guard !transcribedText.isEmpty else { return }
        textDocumentProxy.insertText(transcribedText)
        transcribedText = ""
        previewLabel.text = "Tap 🎙️ to dictate…"
    }

    @objc private func insertAsImage() {
        guard !transcribedText.isEmpty else { return }
        let image = renderTextAsImage(text: transcribedText)
        UIPasteboard.general.image = image
        let alert = UIAlertController(
            title: "Image copied",
            message: "Your handwriting is on the clipboard. Long-press the text field and tap Paste.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    private func renderTextAsImage(text: String) -> UIImage {
        let font = loadHandwritingFont(size: fontSize)
        let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: inkColour]
        let textSize = (text as NSString).boundingRect(
            with: CGSize(width: 600, height: 400),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attrs, context: nil
        ).size
        let padding: CGFloat = 20
        let size = CGSize(width: textSize.width + padding * 2, height: textSize.height + padding * 2)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            text.draw(in: CGRect(origin: CGPoint(x: padding, y: padding), size: textSize), withAttributes: attrs)
        }
    }
}

// MARK: - UIColor hex extension
extension UIColor {
    convenience init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "#", with: "")
        if hexSanitized.count == 6 { hexSanitized += "ff" }
        guard hexSanitized.count == 8, let value = UInt64(hexSanitized, radix: 16) else { return nil }
        self.init(red: CGFloat((value & 0xff000000) >> 24) / 255,
                  green: CGFloat((value & 0x00ff0000) >> 16) / 255,
                  blue: CGFloat((value & 0x0000ff00) >> 8) / 255,
                  alpha: CGFloat(value & 0x000000ff) / 255)
    }
}
