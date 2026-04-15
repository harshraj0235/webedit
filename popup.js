// Anti-inspect security (CSP-compliant - no inline handlers)
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => { if (e.keyCode === 123) e.preventDefault(); });

document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('editBtn');
    const darkBtn = document.getElementById('darkBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    const exportSelBtn = document.getElementById('exportSelBtn');
    const eraserBtn = document.getElementById('eraserBtn');
    const saveBtn = document.getElementById('saveBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const cloneBtn = document.getElementById('cloneBtn');
    const xrayBtn = document.getElementById('xrayBtn');
    const cleanPrintBtn = document.getElementById('cleanPrintBtn');

    // Ultra Pro
    const screenshotBtn = document.getElementById('screenshotBtn');
    const cssBtn = document.getElementById('cssBtn');
    const linkBtn = document.getElementById('linkBtn');
    const annotateBtn = document.getElementById('annotateBtn');
    const dragBtn = document.getElementById('dragBtn');
    const wordCountBtn = document.getElementById('wordCountBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const responsiveBtn = document.getElementById('responsiveBtn');

    // Power Tools
    const snapshotBtn = document.getElementById('snapshotBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const abBtn = document.getElementById('abBtn');
    const tableBtn = document.getElementById('tableBtn');
    const recordBtn = document.getElementById('recordBtn');
    const translateBtn = document.getElementById('translateBtn');
    const aiBtn = document.getElementById('aiBtn');

    // Paywall
    const proView = document.getElementById('proView');
    const activateBtn = document.getElementById('activateBtn');
    const licenseKey = document.getElementById('licenseKey');
    const licenseMessage = document.getElementById('licenseMessage');

    let isPro = false;
    let pdfCount = 0;

    const SECURE_TOKEN = btoa('YOUR_SECRET_KEY');
    chrome.storage.local.get(['_weAuthToken', 'pdfCount', 'isPro'], (result) => {
        if (result.isPro) { chrome.storage.local.remove('isPro'); }
        isPro = (result._weAuthToken === SECURE_TOKEN);
        pdfCount = result.pdfCount || 0;

        if (isPro) {
            proView.classList.add('hidden');
            document.querySelectorAll('.pro-action').forEach(btn => {
                 btn.disabled = false;
                 btn.classList.remove('locked');
                 btn.title = "";
            });
        } else {
            proView.classList.remove('hidden');
            document.querySelectorAll('.pro-action').forEach(btn => {
                 btn.disabled = true;
                 btn.classList.add('locked');
                 btn.title = "PRO Feature - Upgrade Required";
            });
        }
        ensureScriptAndUpdate();
    });

    activateBtn.addEventListener('click', () => {
        const key = licenseKey.value.trim();
        if (key.startsWith('PRO-') && key.length > 5) {
            chrome.storage.local.set({ _weAuthToken: SECURE_TOKEN }, () => {
                isPro = true;
                licenseMessage.style.color = '#00b894';
                licenseMessage.textContent = '✅ License activated successfully!';
                document.querySelectorAll('.pro-action').forEach(btn => {
                     btn.disabled = false;
                     btn.classList.remove('locked');
                     btn.title = "";
                });
                setTimeout(() => { proView.classList.add('hidden'); ensureScriptAndUpdate(); }, 1500);
            });
        } else {
            licenseMessage.style.color = '#ff7675';
            licenseMessage.textContent = '❌ Invalid License Key.';
        }
    });

    function ensureScriptAndSend(message, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
            .then(() => chrome.tabs.sendMessage(tabId, message, callback))
            .catch(() => chrome.tabs.sendMessage(tabId, message, callback));
        });
    }

    function ensureScriptAndUpdate() {
        ensureScriptAndSend({ action: "get_state" }, (response) => {
            if (response) {
                editBtn.textContent = response.isEditing ? '✨ Disable Edit Mode' : '✨ Enable Edit Mode';
                editBtn.classList.toggle('active', response.isEditing);
                darkBtn.textContent = response.isDarkMode ? '☀️ Disable Dark Mode' : '🌙 Toggle Dark Mode';
                if (isPro) {
                    eraserBtn.textContent = response.isErasing ? '🧹 Cancel Eraser' : '🧹 Magic Eraser';
                    eraserBtn.classList.toggle('active', response.isErasing);
                    cloneBtn.textContent = response.isCloning ? '👯 Cancel Cloner' : '👯 Clone Element';
                    cloneBtn.classList.toggle('active', response.isCloning);
                    xrayBtn.textContent = response.isXRaying ? '🔍 Cancel X-Ray' : '🔍 HTML X-Ray';
                    xrayBtn.classList.toggle('active', response.isXRaying);
                    cleanPrintBtn.textContent = response.isCleanPrint ? '📄 Cancel Clean' : '📄 Clean Print';
                    cleanPrintBtn.classList.toggle('active', response.isCleanPrint);
                    cssBtn.textContent = response.isCSSInspecting ? '🎨 Cancel CSS' : '🎨 CSS Editor';
                    cssBtn.classList.toggle('active', response.isCSSInspecting);
                    linkBtn.textContent = response.isLinkEditing ? '🔗 Cancel Links' : '🔗 Link Editor';
                    linkBtn.classList.toggle('active', response.isLinkEditing);
                    annotateBtn.textContent = response.isAnnotating ? '🖍️ Cancel Draw' : '🖍️ Annotate';
                    annotateBtn.classList.toggle('active', response.isAnnotating);
                    dragBtn.textContent = response.isDragging ? '📐 Cancel Drag' : '📐 Drag Layout';
                    dragBtn.classList.toggle('active', response.isDragging);
                }
            }
        });
    }

    // Free
    editBtn.addEventListener('click', () => ensureScriptAndSend({ action: "toggle_edit" }, ensureScriptAndUpdate));
    darkBtn.addEventListener('click', () => ensureScriptAndSend({ action: "toggle_dark" }, ensureScriptAndUpdate));
    
    // Veteran PRO
    eraserBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_eraser" }, ensureScriptAndUpdate); });
    cloneBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_clone" }, ensureScriptAndUpdate); });
    xrayBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_xray" }, ensureScriptAndUpdate); });
    cleanPrintBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_cleanprint" }, ensureScriptAndUpdate); });
    saveBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "save_state" }, ensureScriptAndUpdate); });
    restoreBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "restore_state" }, ensureScriptAndUpdate); });

    // Ultra PRO
    screenshotBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "screenshot" }, ensureScriptAndUpdate); });
    cssBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_css" }, ensureScriptAndUpdate); });
    linkBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_link" }, ensureScriptAndUpdate); });
    annotateBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_annotate" }, ensureScriptAndUpdate); });
    dragBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_drag" }, ensureScriptAndUpdate); });
    wordCountBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "word_count" }, ensureScriptAndUpdate); });
    copyCodeBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "copy_code" }, ensureScriptAndUpdate); });
    responsiveBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "responsive_preview", size: "mobile" }, ensureScriptAndUpdate); });

    // Power Tools
    snapshotBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "snapshot_manager" }, ensureScriptAndUpdate); });
    undoBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "undo" }, ensureScriptAndUpdate); });
    redoBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "redo" }, ensureScriptAndUpdate); });
    abBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "ab_compare" }, ensureScriptAndUpdate); });
    tableBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_table" }, ensureScriptAndUpdate); });
    recordBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "screen_record" }, ensureScriptAndUpdate); });
    translateBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "translate" }, ensureScriptAndUpdate); });
    aiBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "ai_rewrite" }, ensureScriptAndUpdate); });

    function handlePDFExport(actionType) {
        if (!isPro && pdfCount >= 5) {
            proView.classList.remove('hidden');
            licenseMessage.style.color = '#ff7675';
            licenseMessage.textContent = '⚠️ Free limit (5) reached. Upgrade to PRO.';
            return;
        }
        chrome.storage.local.set({ pdfCount: pdfCount + 1 }, () => {
            pdfCount++;
            ensureScriptAndSend({ action: actionType }, ensureScriptAndUpdate);
        });
    }

    pdfBtn.addEventListener('click', () => handlePDFExport("export_pdf"));
    exportSelBtn.addEventListener('click', () => handlePDFExport("export_popup_selection"));
});
