# WebEdit Wizard ✨

**The Ultimate Live Website Editor — Edit Any Webpage Instantly from Your Browser.**

![WebEdit Wizard](https://img.shields.io/badge/Chrome-Extension-brightgreen?style=for-the-badge&logo=googlechrome) ![Edge](https://img.shields.io/badge/Edge-Add--on-blue?style=for-the-badge&logo=microsoftedge) ![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

---

## 🚀 What is WebEdit Wizard?

WebEdit & PDF Wizard is a powerful and intuitive browser extension designed to give users full control over web page content by enabling live editing of text and images directly within any website and allowing easy export of customized views as high-quality PDFs. This versatile tool is ideal for a wide range of users—from developers and marketers to students and professionals—who need to personalize, annotate, or refactor web content quickly and efficiently without complicated developer tools or coding knowledge.

With WebEdit & PDF Wizard, you can seamlessly click anywhere on a webpage to edit text in place, fix typos, rewrite paragraphs, or tailor content to your needs. The image swapper lets you double-click any picture to replace it with your own, either via URL or by uploading from your computer, enabling instant customization of visuals within the page layout. The extension also simplifies the export process by providing dual PDF exporting options, allowing you to save the entire page or just selected parts as clean, print-ready PDFs—perfect for reports, presentations, or offline reference.

Its floating, in-page toolbar keeps all essential functions at your fingertips without cluttering your browsing experience. This minimalist interface lets you toggle editing mode, export PDFs, undo or revert changes, and even switch to an instant dark mode to reduce eye strain on bright websites. Built with user-friendliness in mind, WebEdit & PDF Wizard provides reliable, fast editing and exporting tools that anyone can master.

Upgrading to the Pro version unlocks powerful features like a Magic Eraser Tool to remove annoying pop-ups, sticky banners or chat boxes with a click; Save & Restore functionality that preserves your custom edits even after page reloads; and an HTML X-Ray Editor to visually modify raw HTML code live. The Clone Tool helps duplicate elements like pricing tables or buttons instantly, while Clean-Print mode strips down heavy backgrounds and media to generate ink-saving text documents. Typography Master enables you to enhance website fonts with premium styles for professional-looking displays.

By combining ease of use with advanced editing capabilities, WebEdit & PDF Wizard stands apart from traditional developer consoles and inspect element tools. It acts like a Microsoft Word for the web, giving you unparalleled flexibility to manipulate DOM elements, customize CSS, edit text live, mock up designs, generate authentic-looking screenshots, and produce polished PDFs—all locally and privately on your machine. Your edits never affect websites on the internet and remain personal for productivity, mockups, and personalized printing.

---

## ✨ Features

### Free Features
| Feature | Description |
|---|---|
| ✏️ **Live Text Editor** | Click any text on any webpage to rewrite it instantly |
| 🌙 **Dark Mode** | One-click dark mode for any website |
| 🖼️ **Image Swapper** | Double-click any image to replace it with a local file |
| 📄 **Full Page PDF** | Export the entire webpage as a clean PDF |
| 🖨️ **Selection PDF** | Highlight specific content and export only that section |

### PRO Features
| Feature | Description |
|---|---|
| 🧹 **Magic Eraser** | Hover and click to delete ads, banners, and popups |
| 👯 **Element Cloner** | Duplicate any DOM element with a single click |
| 🔍 **HTML X-Ray Editor** | Click any element to edit its raw HTML in a live code editor |
| 📄 **Clean-Print Mode** | Strip all images/colors for ink-efficient text-only PDFs |
| 💾 **Save & Restore** | Save your edits to browser storage and restore anytime |
| 🔠 **Typography Master** | Change any website's font to premium typefaces |

---

## 📦 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store listing](#)
2. Click **"Add to Chrome"**

### From Microsoft Edge Add-ons
1. Visit the [Edge Add-ons listing](#)
2. Click **"Get"**

### Manual Installation (Developer Mode)
1. Clone this repository: `git clone https://github.com/harshraj0235/webedit.git`
2. Open `chrome://extensions/` in Chrome (or `edge://extensions/` in Edge)
3. Enable **Developer Mode** (top right toggle)
4. Click **"Load Unpacked"** and select the cloned folder
5. The purple **"W"** icon will appear in your toolbar!

---

## 🛠️ Setup for Self-Hosting

To configure your own payment system:

1. **Replace the payment link** in `popup.html` (line with `buyLicenseBtn`)
2. **Set your own secret key** in `popup.js` — replace `YOUR_SECRET_KEY` with a unique string
3. **Configure the auto-unlock webhook** in `content.js` — add your payment success URL detection logic

---

## 🏗️ Tech Stack

- **Manifest V3** — Future-proof Chrome extension architecture
- **Vanilla JavaScript** — Zero dependencies, lightning fast
- **Chrome Storage API** — Secure local license management
- **Content Security Policy** — Hardened against XSS and injection attacks

---

## 📁 Project Structure

```
webedit/
├── manifest.json       # Extension configuration (MV3)
├── popup.html          # Extension popup UI
├── popup.css           # Popup styling (dark theme)
├── popup.js            # Popup logic & license management
├── content.js          # Core editing engine (injected into pages)
├── icon16.png          # Toolbar icon
├── icon48.png          # Extension page icon
└── icon128.png         # Store listing icon
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Made with ❤️ by [Harsh Raj](https://github.com/harshraj0235)
