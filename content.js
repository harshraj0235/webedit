if (window._webeditWizardLoaded) { /* already injected, skip */ } else {
window._webeditWizardLoaded = true;

const WebEditState = {
    isEditing: false,
    isErasing: false,
    isDarkMode: false,
    isXRaying: false,
    isCloning: false,
    isCleanPrint: false,
    isCSSInspecting: false,
    isLinkEditing: false,
    isAnnotating: false,
    isDragging: false,
    toolbar: null,
    lastSelectionRange: null,
    hoverElement: null,
    annotationCanvas: null,
    annotationCtx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    annotationColor: '#ff0000',
    annotationSize: 3
};

// --- Notification System ---
function showNotification(message, bgColor) {
    const existing = document.getElementById('webedit-extension-notification');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'webedit-extension-notification';
    banner.textContent = message;
    banner.style.cssText = `
        position: fixed !important; top: 20px !important; right: 20px !important;
        background: ${bgColor} !important; color: white !important;
        padding: 12px 24px !important; border-radius: 8px !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        font-size: 14px !important; font-weight: bold !important;
        z-index: 2147483647 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        transition: opacity 0.3s ease !important; pointer-events: none !important;
    `;
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }, 2000);
}

// --- Snapshot System (Save/Restore) ---
function savePageState() {
    try {
        const pageKey = 'webedit_snap_' + window.location.href;
        hideToolbar();
        const existing = document.getElementById('webedit-extension-notification');
        if (existing) existing.remove();
        localStorage.setItem(pageKey, document.body.innerHTML);
        showNotification('DOM Snapshot Saved! 💾', '#00b894');
    } catch(e) {
        showNotification('Failed to save state. Page might be too large.', '#ff7675');
    }
}
function restorePageState() {
    try {
        const pageKey = 'webedit_snap_' + window.location.href;
        const saved = localStorage.getItem(pageKey);
        if(saved) {
            document.body.innerHTML = saved;
            showNotification('Edits Restored Successfully! 🔄', '#00b894');
            if (WebEditState.isEditing) { WebEditState.toolbar = null; createToolbar(); }
        } else showNotification('No saved edits found for this URL.', '#f39c12');
    } catch(e) { showNotification('Error restoring state.', '#ff7675'); }
}

// --- Dark Mode System ---
function toggleDarkMode() {
    WebEditState.isDarkMode = !WebEditState.isDarkMode;
    if (WebEditState.isDarkMode) {
        document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
        const style = document.createElement('style');
        style.id = 'webedit-darkmode-style';
        style.textContent = `img, video, iframe, canvas { filter: invert(1) hue-rotate(180deg) !important; }`;
        document.head.appendChild(style);
        showNotification('Dark Mode ON 🌙', '#2c3e50');
    } else {
        document.documentElement.style.filter = '';
        const style = document.getElementById('webedit-darkmode-style');
        if (style) style.remove();
        showNotification('Dark Mode OFF ☀️', '#f39c12');
    }
    return WebEditState.isDarkMode;
}

// --- Clean Print Mode ---
function toggleCleanPrintMode() {
    WebEditState.isCleanPrint = !WebEditState.isCleanPrint;
    if (WebEditState.isCleanPrint) {
        const style = document.createElement('style');
        style.id = 'webedit-cleanprint-style';
        style.textContent = `
            body, html { background: white !important; color: black !important; }
            * { background-image: none !important; background-color: transparent !important; color: black !important; box-shadow: none !important; }
            img, video, iframe, canvas, svg { display: none !important; }
        `;
        document.head.appendChild(style);
        showNotification('Clean-Print Mode ON 📄 (Images/Colors hidden)', '#2c3e50');
    } else {
        const style = document.getElementById('webedit-cleanprint-style');
        if (style) style.remove();
        showNotification('Clean-Print Mode OFF', '#f39c12');
    }
    return WebEditState.isCleanPrint;
}

// --- Mutually Exclusive Mode Helper ---
function disableConflictingModes(except) {
    if (except !== 'edit' && WebEditState.isEditing) toggleEditMode();
    if (except !== 'eraser' && WebEditState.isErasing) toggleEraserMode();
    if (except !== 'clone' && WebEditState.isCloning) toggleCloneMode();
    if (except !== 'xray' && WebEditState.isXRaying) toggleXRayMode();
}

// --- Magic Eraser System ---
function handleEraserHover(e) {
    if (!WebEditState.isErasing) return;
    if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
    WebEditState.hoverElement = e.target;
    WebEditState.hoverElement.style.outline = '3px solid #ff7675';
    WebEditState.hoverElement.style.outlineOffset = '-3px';
    WebEditState.hoverElement.style.cursor = 'crosshair';
}
function handleEraserClick(e) {
    if (!WebEditState.isErasing) return;
    e.preventDefault(); e.stopPropagation();
    if (WebEditState.hoverElement) {
        WebEditState.hoverElement.style.outline = '';
        WebEditState.hoverElement.remove();
        WebEditState.hoverElement = null;
    }
}
function toggleEraserMode() {
    WebEditState.isErasing = !WebEditState.isErasing;
    if (WebEditState.isErasing) {
        disableConflictingModes('eraser');
        document.addEventListener('mouseover', handleEraserHover, true);
        document.addEventListener('click', handleEraserClick, true);
        document.body.style.cursor = 'crosshair';
        showNotification('Magic Eraser ON 🧹 (Click items to vanish)', '#ff7675');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleEraserHover, true);
        document.removeEventListener('click', handleEraserClick, true);
        document.body.style.cursor = 'default';
        showNotification('Magic Eraser OFF 🔒', '#00b894');
    }
    return WebEditState.isErasing;
}

// --- Element Cloner System ---
function handleCloneHover(e) {
    if (!WebEditState.isCloning) return;
    if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
    WebEditState.hoverElement = e.target;
    WebEditState.hoverElement.style.outline = '3px solid #00b894';
    WebEditState.hoverElement.style.outlineOffset = '-3px';
    WebEditState.hoverElement.style.cursor = 'copy';
}
function handleCloneClick(e) {
    if (!WebEditState.isCloning) return;
    e.preventDefault(); e.stopPropagation();
    if (WebEditState.hoverElement) {
        const clone = WebEditState.hoverElement.cloneNode(true);
        clone.style.outline = '';
        WebEditState.hoverElement.parentNode.insertBefore(clone, WebEditState.hoverElement.nextSibling);
        showNotification('Element Duplicated! 👯', '#00b894');
    }
}
function toggleCloneMode() {
    WebEditState.isCloning = !WebEditState.isCloning;
    if (WebEditState.isCloning) {
        disableConflictingModes('clone');
        document.addEventListener('mouseover', handleCloneHover, true);
        document.addEventListener('click', handleCloneClick, true);
        document.body.style.cursor = 'copy';
        showNotification('Element Cloner ON 👯 (Click to duplicate)', '#00b894');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleCloneHover, true);
        document.removeEventListener('click', handleCloneClick, true);
        document.body.style.cursor = 'default';
        showNotification('Element Cloner OFF 🔒', '#ff7675');
    }
    return WebEditState.isCloning;
}

// --- HTML X-Ray Editor System ---
function openXRayEditor(element) {
    if (document.getElementById('webedit-xray-editor')) return;
    const overlay = document.createElement('div');
    overlay.id = 'webedit-xray-editor';
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;`;
    
    const box = document.createElement('div');
    box.style.cssText = `background:#1a1a24;padding:20px;border-radius:12px;width:80%;max-width:800px;display:flex;flex-direction:column;gap:15px;box-shadow:0 10px 30px rgba(0,0,0,0.5);`;
    
    // Header text
    const header = document.createElement('h3');
    header.textContent = '🔍 HTML X-Ray Editor';
    header.style.cssText = 'color: #f0f0f5; margin: 0; font-family: sans-serif;';
    
    const textarea = document.createElement('textarea');
    textarea.value = element.outerHTML;
    textarea.style.cssText = `width:100%;height:350px;background:#0d0d14;color:#a3f7bf;font-family:monospace;padding:15px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;resize:vertical;font-size:14px;outline:none;`;
    textarea.setAttribute("spellcheck", "false");
    
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display:flex;justify-content:flex-end;gap:10px;`;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `padding:8px 16px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:white;border-radius:6px;cursor:pointer;`;
    cancelBtn.onclick = () => overlay.remove();
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save HTML';
    saveBtn.style.cssText = `padding:8px 16px;background:#00b894;border:none;color:white;border-radius:6px;cursor:pointer;font-weight:bold;`;
    saveBtn.onclick = () => {
        const temp = document.createElement('div');
        temp.innerHTML = textarea.value;
        const newEl = temp.firstElementChild;
        if(newEl) {
            element.replaceWith(newEl);
            showNotification('HTML Live Updated! ✨', '#00b894');
        }
        overlay.remove();
        toggleXRayMode(); // auto exit after edit
    };
    
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(header);
    box.appendChild(textarea);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function handleXRayHover(e) {
    if (!WebEditState.isXRaying) return;
    if (document.getElementById('webedit-xray-editor')) return; // ignore hover if open
    if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
    WebEditState.hoverElement = e.target;
    WebEditState.hoverElement.style.outline = '3px dashed #0984e3';
    WebEditState.hoverElement.style.outlineOffset = '-3px';
    WebEditState.hoverElement.style.cursor = 'cell';
}
function handleXRayClick(e) {
    if (!WebEditState.isXRaying) return;
    if (document.getElementById('webedit-xray-editor')) return; 
    e.preventDefault(); e.stopPropagation();
    if (WebEditState.hoverElement) {
        WebEditState.hoverElement.style.outline = '';
        openXRayEditor(WebEditState.hoverElement);
        WebEditState.hoverElement = null; // reset hover lock
    }
}
function toggleXRayMode() {
    WebEditState.isXRaying = !WebEditState.isXRaying;
    if (WebEditState.isXRaying) {
        disableConflictingModes('xray');
        document.addEventListener('mouseover', handleXRayHover, true);
        document.addEventListener('click', handleXRayClick, true);
        document.body.style.cursor = 'cell';
        showNotification('HTML X-Ray ON 🔍 (Click item to edit code)', '#0984e3');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleXRayHover, true);
        document.removeEventListener('click', handleXRayClick, true);
        document.body.style.cursor = 'default';
        showNotification('HTML X-Ray OFF 🔒', '#ff7675');
    }
    return WebEditState.isXRaying;
}

// --- Edit Mode & Toolbar System ---
function saveSelection() {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) WebEditState.lastSelectionRange = sel.getRangeAt(0);
}
function restoreSelection() {
    if (WebEditState.lastSelectionRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(WebEditState.lastSelectionRange);
    }
}

function handleImageDoubleClick(e) {
    if (!WebEditState.isEditing) return;
    if (e.target.tagName === 'IMG') {
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = 'image/*';
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    e.target.src = readerEvent.target.result;
                    showNotification('Image Swapped Successfully! 🖼️', '#00b894');
                };
                reader.readAsDataURL(file);
            }
        };
        fileInput.click();
    }
}

function createToolbar() {
    if (document.getElementById('webedit-floating-toolbar')) return;
    WebEditState.toolbar = document.createElement('div');
    WebEditState.toolbar.id = 'webedit-floating-toolbar';
    WebEditState.toolbar.innerHTML = `
        <button data-command="undo" title="Undo (Ctrl+Z)">↩️</button>
        <button data-command="redo" title="Redo (Ctrl+Y)">↪️</button>
        <div class="webedit-divider"></div>
        <select id="webedit-font-selector" class="font-dropdown" title="Change Font Typography">
            <option value="">Font</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="Helvetica, sans-serif">Helvetica</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier</option>
            <option value="'Comic Sans MS', cursive">Comic Sans</option>
        </select>
        <div class="webedit-divider"></div>
        <button data-command="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button data-command="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button data-command="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <div class="webedit-divider"></div>
        <div class="color-picker-wrapper" title="Text Color">
            <span>A</span><input type="color" class="color-input" data-command="foreColor" value="#000000">
        </div>
        <div class="color-picker-wrapper" title="Highlight Color">
            <span>🖍️</span><input type="color" class="color-input" data-command="hiliteColor" value="#ffff00">
        </div>
        <div class="webedit-divider"></div>
        <button data-command="insertImageFile" title="Upload New Image">🖼️</button>
        <button data-command="exportSelection" title="Export Only Selected Area to PDF" style="color:#00b894;">🖨️</button>
        <div class="webedit-divider"></div>
        <button data-command="removeFormat" title="Clear Formatting">🧹</button>
        <button data-command="delete" title="Delete Element" style="color:#ff7675;">🗑️</button>
    `;

    WebEditState.toolbar.style.cssText = `
        position: absolute; display: none; background: #1a1a24;
        border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); padding: 6px;
        z-index: 2147483647; align-items: center; gap: 4px;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    const style = document.createElement('style');
    style.id = "webedit-toolbar-styles";
    style.textContent = `
        #webedit-floating-toolbar button { background: transparent; border: none; color: #f0f0f5; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; margin: 0; padding: 0; }
        #webedit-floating-toolbar button:hover { background: rgba(255,255,255,0.1); }
        #webedit-floating-toolbar .webedit-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.1); margin: 0 4px; }
        #webedit-floating-toolbar .color-picker-wrapper { position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; cursor: pointer; overflow: hidden; transition: background 0.2s; color: #f0f0f5; }
        #webedit-floating-toolbar .color-picker-wrapper:hover { background: rgba(255,255,255,0.1); }
        #webedit-floating-toolbar .color-input { position: absolute; left: -10px; top: -10px; width: 50px; height: 50px; opacity: 0; cursor: pointer; }
        #webedit-floating-toolbar .color-picker-wrapper span { pointer-events: none; font-size: 14px; font-weight: bold; }
        #webedit-floating-toolbar .font-dropdown { background: transparent; color: #f0f0f5; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px; font-size: 12px; outline: none; cursor: pointer; }
        #webedit-floating-toolbar .font-dropdown option { background: #1a1a24; color: #f0f0f5; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(WebEditState.toolbar);

    WebEditState.toolbar.addEventListener('change', (e) => {
        if(e.target.id === 'webedit-font-selector') {
            restoreSelection();
            if(e.target.value) document.execCommand('fontName', false, e.target.value);
            saveSelection();
        }
    });

    WebEditState.toolbar.addEventListener('mousedown', (e) => {
        if (e.target.id === 'webedit-font-selector') return; // let select run natively
        if (!e.target.classList.contains('color-input')) e.preventDefault(); 
        else saveSelection();
        
        const btn = e.target.closest('button');
        if (btn) {
            const cmd = btn.getAttribute('data-command');
            if (cmd === 'delete') {
                const sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    const node = sel.anchorNode.parentNode;
                    if (node && node !== document.body) { node.remove(); hideToolbar(); }
                }
            } else if (cmd === 'exportSelection') {
                const sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    const node = sel.anchorNode.parentNode;
                    if (node && node !== document.body && node !== document.documentElement) {
                        node.classList.add('webedit-print-target');
                        const printStyle = document.createElement('style');
                        printStyle.id = 'webedit-print-selection-style';
                        printStyle.innerHTML = `
                            @media print {
                                body * { visibility: hidden !important; }
                                .webedit-print-target, .webedit-print-target * { visibility: visible !important; }
                                .webedit-print-target { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; }
                            }
                        `;
                        document.head.appendChild(printStyle);
                        const wasEditing = WebEditState.isEditing;
                        if (wasEditing) { document.designMode = 'off'; hideToolbar(); }
                        window.print();
                        node.classList.remove('webedit-print-target');
                        printStyle.remove();
                        if (wasEditing) document.designMode = 'on';
                        showNotification('Selection PDF Exported Successfully! 🖨️', '#00b894');
                    }
                }
            } else if (cmd === 'insertImageFile') {
                const fileInput = document.createElement('input');
                fileInput.type = 'file'; fileInput.accept = 'image/*';
                fileInput.onchange = (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (readerEvent) => {
                            restoreSelection();
                            document.execCommand('insertImage', false, readerEvent.target.result);
                            saveSelection();
                            showNotification('Image Inserted! 🖼️', '#00b894');
                        };
                        reader.readAsDataURL(file);
                    }
                };
                fileInput.click();
            } else {
                document.execCommand(cmd, false, null);
            }
        }
    });
    WebEditState.toolbar.addEventListener('input', (e) => {
        if (e.target.classList.contains('color-input')) {
            restoreSelection();
            const cmd = e.target.getAttribute('data-command');
            const val = e.target.value;
            const finalCmd = (cmd === 'hiliteColor' && !document.queryCommandSupported('hiliteColor')) ? 'backColor' : cmd;
            document.execCommand(finalCmd, false, val);
            saveSelection();
        }
    });
}

function showToolbarAtSelection() {
    if (!WebEditState.isEditing || !WebEditState.toolbar) return;
    const selection = window.getSelection();
    if (!selection.isCollapsed && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        WebEditState.toolbar.style.display = 'flex';
        WebEditState.toolbar.style.top = `${window.scrollY + rect.top - WebEditState.toolbar.offsetHeight - 10}px`;
        const left = window.scrollX + rect.left + (rect.width / 2) - (WebEditState.toolbar.offsetWidth / 2);
        WebEditState.toolbar.style.left = `${Math.max(10, left)}px`;
    } else hideToolbar();
}
function hideToolbar() { if (WebEditState.toolbar) WebEditState.toolbar.style.display = 'none'; }
function handleSelectionChange(e) {
    if (WebEditState.isEditing) {
        if (e && e.target && WebEditState.toolbar && WebEditState.toolbar.contains(e.target)) return;
        setTimeout(showToolbarAtSelection, 50);
    }
}

function toggleEditMode() {
    WebEditState.isEditing = !WebEditState.isEditing;
    if (WebEditState.isEditing) {
        disableConflictingModes('edit'); 
        document.designMode = 'on';
        document.addEventListener('dblclick', handleImageDoubleClick);
        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);
        createToolbar();
        showNotification('Edit Mode Enabled ✨ (Highlight text or double-click items)', '#00b894');
    } else {
        document.designMode = 'off';
        document.removeEventListener('dblclick', handleImageDoubleClick);
        document.removeEventListener('mouseup', handleSelectionChange);
        document.removeEventListener('keyup', handleSelectionChange);
        hideToolbar();
        showNotification('Edit Mode Disabled 🔒', '#a0a0b5');
    }
    return WebEditState.isEditing;
}
function printAsPDF() { hideToolbar(); window.print(); }

// --- FEATURE 1: Full Page Screenshot ---
function captureFullPageScreenshot() {
    showNotification('Capturing full page screenshot... 📸', '#6c5ce7');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const totalWidth = document.documentElement.scrollWidth;
    const totalHeight = document.documentElement.scrollHeight;
    canvas.width = Math.min(totalWidth, 1920);
    canvas.height = Math.min(totalHeight, 16384);

    // Use html2canvas-like approach: serialize DOM to SVG foreignObject
    const data = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
        <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">${new XMLSerializer().serializeToString(document.documentElement)}</div>
        </foreignObject>
    </svg>`;
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((pngBlob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(pngBlob);
            a.download = `WebEdit_Screenshot_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
            showNotification('Screenshot saved! 📸', '#00b894');
        }, 'image/png');
    };
    img.onerror = () => {
        // Fallback: simple visible area screenshot
        URL.revokeObjectURL(url);
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = window.innerWidth;
        fallbackCanvas.height = window.innerHeight;
        const fCtx = fallbackCanvas.getContext('2d');
        fCtx.fillStyle = '#ffffff';
        fCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        fCtx.font = '24px Arial';
        fCtx.fillStyle = '#333';
        fCtx.fillText('WebEdit Wizard Screenshot - ' + document.title, 20, 40);
        fCtx.font = '16px Arial';
        fCtx.fillText(window.location.href, 20, 70);
        fCtx.fillText('Page Size: ' + totalWidth + 'x' + totalHeight, 20, 100);
        fallbackCanvas.toBlob((b) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `WebEdit_Screenshot_${Date.now()}.png`;
            a.click();
            showNotification('Screenshot saved (basic mode)! 📸', '#00b894');
        }, 'image/png');
    };
    img.src = url;
}

// --- FEATURE 2: CSS Inspector & Editor ---
function handleCSSHover(e) {
    if (!WebEditState.isCSSInspecting) return;
    if (document.getElementById('webedit-css-panel')) return;
    if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
    WebEditState.hoverElement = e.target;
    WebEditState.hoverElement.style.outline = '2px dashed #e17055';
    WebEditState.hoverElement.style.cursor = 'crosshair';
}
function handleCSSClick(e) {
    if (!WebEditState.isCSSInspecting) return;
    if (document.getElementById('webedit-css-panel')) return;
    e.preventDefault(); e.stopPropagation();
    if (!WebEditState.hoverElement) return;
    WebEditState.hoverElement.style.outline = '';
    const el = WebEditState.hoverElement;
    const computed = window.getComputedStyle(el);
    const props = ['color','background-color','font-size','font-family','font-weight','padding','margin','border','border-radius','width','height','display','position','text-align','line-height','opacity','box-shadow'];
    
    const overlay = document.createElement('div');
    overlay.id = 'webedit-css-panel';
    overlay.style.cssText = 'position:fixed;top:0;right:0;width:360px;height:100vh;background:#1a1a24;z-index:2147483647;box-shadow:-4px 0 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;font-family:system-ui,sans-serif;';
    
    let html = `<div style="padding:15px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#e17055;font-weight:bold;font-size:14px;">🎨 CSS Inspector</span>
        <button id="webedit-css-close" style="background:transparent;border:none;color:#ff7675;font-size:20px;cursor:pointer;">✕</button>
    </div>
    <div style="padding:10px;color:#a0a0b5;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.1);">
        &lt;${el.tagName.toLowerCase()}&gt; ${el.className ? '.' + el.className.split(' ')[0] : ''} ${el.id ? '#' + el.id : ''}
    </div>
    <div style="flex:1;overflow-y:auto;padding:10px;" id="webedit-css-props">`;
    
    props.forEach(p => {
        const val = computed.getPropertyValue(p);
        html += `<div style="display:flex;align-items:center;margin-bottom:6px;gap:6px;">
            <label style="color:#a0a0b5;font-size:11px;width:120px;flex-shrink:0;">${p}</label>
            <input type="text" data-prop="${p}" value="${val}" style="flex:1;background:#0d0d14;border:1px solid rgba(255,255,255,0.1);color:#a3f7bf;padding:5px 8px;border-radius:4px;font-size:11px;font-family:monospace;outline:none;">
        </div>`;
    });
    html += '</div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    
    overlay.querySelector('#webedit-css-close').onclick = () => { overlay.remove(); };
    overlay.querySelectorAll('input[data-prop]').forEach(input => {
        input.addEventListener('change', (ev) => {
            el.style[ev.target.dataset.prop.replace(/-([a-z])/g, (m,c) => c.toUpperCase())] = ev.target.value;
            showNotification(`CSS updated: ${ev.target.dataset.prop}`, '#e17055');
        });
    });
}
function toggleCSSInspector() {
    WebEditState.isCSSInspecting = !WebEditState.isCSSInspecting;
    if (WebEditState.isCSSInspecting) {
        disableConflictingModes('css');
        document.addEventListener('mouseover', handleCSSHover, true);
        document.addEventListener('click', handleCSSClick, true);
        document.body.style.cursor = 'crosshair';
        showNotification('CSS Inspector ON 🎨 (Click any element to edit styles)', '#e17055');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleCSSHover, true);
        document.removeEventListener('click', handleCSSClick, true);
        const panel = document.getElementById('webedit-css-panel');
        if (panel) panel.remove();
        document.body.style.cursor = 'default';
        showNotification('CSS Inspector OFF', '#a0a0b5');
    }
    return WebEditState.isCSSInspecting;
}

// --- FEATURE 3: Link Editor ---
function handleLinkHover(e) {
    if (!WebEditState.isLinkEditing) return;
    const link = e.target.closest('a');
    if (WebEditState.hoverElement && WebEditState.hoverElement !== link) WebEditState.hoverElement.style.outline = '';
    if (link) {
        WebEditState.hoverElement = link;
        link.style.outline = '2px solid #fdcb6e';
        link.style.cursor = 'pointer';
    }
}
function handleLinkClick(e) {
    if (!WebEditState.isLinkEditing) return;
    const link = e.target.closest('a');
    if (!link) return;
    e.preventDefault(); e.stopPropagation();
    link.style.outline = '';
    
    const currentURL = link.href;
    const currentText = link.textContent;
    
    const overlay = document.createElement('div');
    overlay.id = 'webedit-link-editor';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#1a1a24;padding:25px;border-radius:12px;width:500px;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;">
            <h3 style="color:#fdcb6e;margin:0 0 20px 0;">🔗 Link Editor</h3>
            <div style="margin-bottom:12px;">
                <label style="color:#a0a0b5;font-size:12px;display:block;margin-bottom:4px;">Link Text</label>
                <input id="webedit-link-text" type="text" value="${currentText.replace(/"/g, '&quot;')}" style="width:100%;background:#0d0d14;border:1px solid rgba(255,255,255,0.1);color:#f0f0f5;padding:10px;border-radius:6px;font-size:14px;outline:none;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:#a0a0b5;font-size:12px;display:block;margin-bottom:4px;">URL</label>
                <input id="webedit-link-url" type="text" value="${currentURL}" style="width:100%;background:#0d0d14;border:1px solid rgba(255,255,255,0.1);color:#a3f7bf;padding:10px;border-radius:6px;font-size:14px;font-family:monospace;outline:none;box-sizing:border-box;">
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="webedit-link-cancel" style="padding:10px 20px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:white;border-radius:6px;cursor:pointer;">Cancel</button>
                <button id="webedit-link-save" style="padding:10px 20px;background:#fdcb6e;color:#1a1a24;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Save Link</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    
    overlay.querySelector('#webedit-link-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#webedit-link-save').onclick = () => {
        link.href = overlay.querySelector('#webedit-link-url').value;
        link.textContent = overlay.querySelector('#webedit-link-text').value;
        overlay.remove();
        showNotification('Link updated! 🔗', '#fdcb6e');
    };
}
function toggleLinkEditor() {
    WebEditState.isLinkEditing = !WebEditState.isLinkEditing;
    if (WebEditState.isLinkEditing) {
        disableConflictingModes('link');
        document.addEventListener('mouseover', handleLinkHover, true);
        document.addEventListener('click', handleLinkClick, true);
        showNotification('Link Editor ON 🔗 (Click any link to edit)', '#fdcb6e');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleLinkHover, true);
        document.removeEventListener('click', handleLinkClick, true);
        const editor = document.getElementById('webedit-link-editor');
        if (editor) editor.remove();
        showNotification('Link Editor OFF', '#a0a0b5');
    }
    return WebEditState.isLinkEditing;
}

// --- FEATURE 4: Annotation / Drawing Tool ---
function createAnnotationCanvas() {
    if (document.getElementById('webedit-annotation-canvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'webedit-annotation-canvas';
    canvas.width = document.documentElement.scrollWidth;
    canvas.height = document.documentElement.scrollHeight;
    canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483640;pointer-events:auto;cursor:crosshair;';
    document.body.appendChild(canvas);
    WebEditState.annotationCanvas = canvas;
    WebEditState.annotationCtx = canvas.getContext('2d');
    
    // Annotation toolbar
    const bar = document.createElement('div');
    bar.id = 'webedit-annotation-bar';
    bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a24;padding:8px 16px;border-radius:12px;z-index:2147483647;display:flex;gap:10px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;';
    bar.innerHTML = `
        <input type="color" id="webedit-anno-color" value="#ff0000" style="width:28px;height:28px;border:none;border-radius:4px;cursor:pointer;background:transparent;">
        <select id="webedit-anno-size" style="background:#0d0d14;color:#f0f0f5;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:4px;font-size:12px;">
            <option value="2">Thin</option><option value="4" selected>Medium</option><option value="8">Thick</option><option value="16">Bold</option>
        </select>
        <button id="webedit-anno-clear" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ff7675;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">🗑️ Clear</button>
        <button id="webedit-anno-save" style="background:#00b894;border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">💾 Save</button>
    `;
    document.body.appendChild(bar);
    
    bar.querySelector('#webedit-anno-color').oninput = (e) => { WebEditState.annotationColor = e.target.value; };
    bar.querySelector('#webedit-anno-size').onchange = (e) => { WebEditState.annotationSize = parseInt(e.target.value); };
    bar.querySelector('#webedit-anno-clear').onclick = () => {
        WebEditState.annotationCtx.clearRect(0, 0, canvas.width, canvas.height);
        showNotification('Annotations cleared!', '#ff7675');
    };
    bar.querySelector('#webedit-anno-save').onclick = () => {
        canvas.toBlob((blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `WebEdit_Annotation_${Date.now()}.png`;
            a.click();
            showNotification('Annotation saved as PNG! 💾', '#00b894');
        }, 'image/png');
    };
    
    canvas.addEventListener('mousedown', (e) => {
        WebEditState.isDrawing = true;
        WebEditState.lastX = e.pageX;
        WebEditState.lastY = e.pageY;
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!WebEditState.isDrawing) return;
        const ctx = WebEditState.annotationCtx;
        ctx.beginPath();
        ctx.strokeStyle = WebEditState.annotationColor;
        ctx.lineWidth = WebEditState.annotationSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(WebEditState.lastX, WebEditState.lastY);
        ctx.lineTo(e.pageX, e.pageY);
        ctx.stroke();
        WebEditState.lastX = e.pageX;
        WebEditState.lastY = e.pageY;
    });
    canvas.addEventListener('mouseup', () => { WebEditState.isDrawing = false; });
    canvas.addEventListener('mouseleave', () => { WebEditState.isDrawing = false; });
}
function toggleAnnotationMode() {
    WebEditState.isAnnotating = !WebEditState.isAnnotating;
    if (WebEditState.isAnnotating) {
        disableConflictingModes('annotate');
        createAnnotationCanvas();
        showNotification('Annotation Mode ON 🖍️ (Draw on the page!)', '#e84393');
    } else {
        const canvas = document.getElementById('webedit-annotation-canvas');
        const bar = document.getElementById('webedit-annotation-bar');
        if (canvas) canvas.remove();
        if (bar) bar.remove();
        WebEditState.annotationCanvas = null;
        WebEditState.annotationCtx = null;
        showNotification('Annotation Mode OFF', '#a0a0b5');
    }
    return WebEditState.isAnnotating;
}

// --- FEATURE 5: Word Counter & Readability ---
function showWordCounter() {
    const existing = document.getElementById('webedit-wordcount-panel');
    if (existing) { existing.remove(); return; }
    
    const sel = window.getSelection();
    let text = '';
    if (sel && sel.toString().trim() !== '') {
        text = sel.toString();
    } else {
        text = document.body.innerText;
    }
    
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
    const readingTime = Math.ceil(words / 200);
    const avgWordLen = words > 0 ? (chars / words).toFixed(1) : 0;
    const source = (sel && sel.toString().trim() !== '') ? 'Selected Text' : 'Full Page';
    
    const panel = document.createElement('div');
    panel.id = 'webedit-wordcount-panel';
    panel.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1a1a24;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;z-index:2147483647;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;min-width:250px;';
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <span style="color:#00cec9;font-weight:bold;font-size:14px;">🧮 Word Counter</span>
            <button onclick="this.closest('#webedit-wordcount-panel').remove()" style="background:transparent;border:none;color:#ff7675;font-size:18px;cursor:pointer;">✕</button>
        </div>
        <div style="color:#a0a0b5;font-size:11px;margin-bottom:12px;">Source: ${source}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="background:#0d0d14;padding:10px;border-radius:8px;text-align:center;">
                <div style="color:#00b894;font-size:24px;font-weight:bold;">${words.toLocaleString()}</div>
                <div style="color:#a0a0b5;font-size:10px;margin-top:4px;">Words</div>
            </div>
            <div style="background:#0d0d14;padding:10px;border-radius:8px;text-align:center;">
                <div style="color:#6c5ce7;font-size:24px;font-weight:bold;">${chars.toLocaleString()}</div>
                <div style="color:#a0a0b5;font-size:10px;margin-top:4px;">Characters</div>
            </div>
            <div style="background:#0d0d14;padding:10px;border-radius:8px;text-align:center;">
                <div style="color:#fdcb6e;font-size:24px;font-weight:bold;">${sentences}</div>
                <div style="color:#a0a0b5;font-size:10px;margin-top:4px;">Sentences</div>
            </div>
            <div style="background:#0d0d14;padding:10px;border-radius:8px;text-align:center;">
                <div style="color:#e17055;font-size:24px;font-weight:bold;">${paragraphs}</div>
                <div style="color:#a0a0b5;font-size:10px;margin-top:4px;">Paragraphs</div>
            </div>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;padding:10px;background:#0d0d14;border-radius:8px;">
            <span style="color:#a0a0b5;font-size:11px;">⏱️ Reading: ~${readingTime} min</span>
            <span style="color:#a0a0b5;font-size:11px;">📏 Avg: ${avgWordLen} chars/word</span>
        </div>
    `;
    document.body.appendChild(panel);
    showNotification('Word count calculated! 🧮', '#00cec9');
}

// --- FEATURE 6: Drag & Drop Layout ---
function handleDragHover(e) {
    if (!WebEditState.isDragging) return;
    if (e.target.id && e.target.id.startsWith('webedit-')) return;
    if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
    WebEditState.hoverElement = e.target;
    WebEditState.hoverElement.style.outline = '2px dashed #00cec9';
    WebEditState.hoverElement.style.cursor = 'grab';
}
function handleDragStart(e) {
    if (!WebEditState.isDragging) return;
    if (e.target.id && e.target.id.startsWith('webedit-')) return;
    e.target.setAttribute('draggable', 'true');
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.effectAllowed = 'move';
    WebEditState._dragSource = e.target;
    e.target.style.opacity = '0.5';
}
function handleDragOver(e) {
    if (!WebEditState.isDragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (e.target !== WebEditState._dragSource) {
        e.target.style.borderTop = '3px solid #00cec9';
    }
}
function handleDragLeave(e) {
    if (!WebEditState.isDragging) return;
    e.target.style.borderTop = '';
}
function handleDrop(e) {
    if (!WebEditState.isDragging) return;
    e.preventDefault();
    e.target.style.borderTop = '';
    if (WebEditState._dragSource && e.target !== WebEditState._dragSource) {
        WebEditState._dragSource.style.opacity = '1';
        e.target.parentNode.insertBefore(WebEditState._dragSource, e.target);
        showNotification('Element moved! 📐', '#00cec9');
    }
}
function handleDragEnd(e) {
    if (WebEditState._dragSource) WebEditState._dragSource.style.opacity = '1';
    WebEditState._dragSource = null;
}
function toggleDragMode() {
    WebEditState.isDragging = !WebEditState.isDragging;
    if (WebEditState.isDragging) {
        disableConflictingModes('drag');
        document.addEventListener('mouseover', handleDragHover, true);
        document.addEventListener('dragstart', handleDragStart, true);
        document.addEventListener('dragover', handleDragOver, true);
        document.addEventListener('dragleave', handleDragLeave, true);
        document.addEventListener('drop', handleDrop, true);
        document.addEventListener('dragend', handleDragEnd, true);
        // Make all top-level children draggable
        document.querySelectorAll('body > *').forEach(el => { if (!el.id || !el.id.startsWith('webedit-')) el.setAttribute('draggable', 'true'); });
        showNotification('Drag & Drop ON 📐 (Drag elements to rearrange)', '#00cec9');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleDragHover, true);
        document.removeEventListener('dragstart', handleDragStart, true);
        document.removeEventListener('dragover', handleDragOver, true);
        document.removeEventListener('dragleave', handleDragLeave, true);
        document.removeEventListener('drop', handleDrop, true);
        document.removeEventListener('dragend', handleDragEnd, true);
        document.querySelectorAll('[draggable=true]').forEach(el => el.removeAttribute('draggable'));
        showNotification('Drag & Drop OFF', '#a0a0b5');
    }
    return WebEditState.isDragging;
}

// --- FEATURE 7: Copy Element as Code ---
function copyElementAsCode() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && sel.anchorNode) {
        const el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
        if (el && el !== document.body) {
            const computed = window.getComputedStyle(el);
            const styles = ['color','background','font-size','font-family','padding','margin','border','border-radius','display','width','height','text-align'];
            let css = '';
            styles.forEach(s => { css += `  ${s}: ${computed.getPropertyValue(s)};\n`; });
            const code = `<!-- HTML -->\n${el.outerHTML}\n\n/* CSS */\n.element {\n${css}}`;
            navigator.clipboard.writeText(code).then(() => {
                showNotification('HTML + CSS copied to clipboard! 📋', '#00b894');
            }).catch(() => {
                // Fallback
                const ta = document.createElement('textarea');
                ta.value = code;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showNotification('HTML + CSS copied to clipboard! 📋', '#00b894');
            });
        }
    } else {
        showNotification('Select an element first!', '#ff7675');
    }
}

// --- FEATURE 8: Responsive Preview ---
function toggleResponsivePreview(size) {
    const existing = document.getElementById('webedit-responsive-frame');
    if (existing) { existing.remove(); showNotification('Preview closed', '#a0a0b5'); return; }
    
    const sizes = {
        'mobile': { w: 375, h: 667, label: 'iPhone SE' },
        'tablet': { w: 768, h: 1024, label: 'iPad' },
        'desktop': { w: 1440, h: 900, label: 'Desktop' }
    };
    const s = sizes[size] || sizes['mobile'];
    
    const overlay = document.createElement('div');
    overlay.id = 'webedit-responsive-frame';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="color:white;font-family:system-ui;margin-bottom:10px;display:flex;gap:15px;align-items:center;">
            <span style="font-size:14px;">${s.label} (${s.w}×${s.h})</span>
            <button onclick="document.getElementById('webedit-responsive-frame').remove()" style="background:#ff7675;border:none;color:white;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">Close</button>
        </div>
        <iframe src="${window.location.href}" style="width:${s.w}px;height:${s.h}px;border:2px solid #6c5ce7;border-radius:12px;background:white;"></iframe>
    `;
    document.body.appendChild(overlay);
    showNotification(`${s.label} preview active 📱`, '#6c5ce7');
}

// --- FEATURE 9: Multi-Snapshot Manager ---
function openSnapshotManager() {
    const existing = document.getElementById('webedit-snapshot-mgr');
    if (existing) { existing.remove(); return; }

    const prefix = 'webedit_snap_';
    const snaps = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(prefix)) snaps.push(key);
    }

    const overlay = document.createElement('div');
    overlay.id = 'webedit-snapshot-mgr';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';

    let listHTML = '';
    if (snaps.length === 0) {
        listHTML = '<p style="color:#a0a0b5;text-align:center;">No snapshots saved yet. Use "Save Edits" first!</p>';
    } else {
        snaps.forEach((key, i) => {
            const url = key.replace(prefix, '');
            const shortURL = url.length > 50 ? url.substring(0, 50) + '...' : url;
            const size = (localStorage.getItem(key).length / 1024).toFixed(1);
            listHTML += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#0d0d14;border-radius:6px;margin-bottom:6px;">
                <div style="flex:1;min-width:0;">
                    <div style="color:#f0f0f5;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${shortURL}</div>
                    <div style="color:#a0a0b5;font-size:10px;">${size} KB</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button data-snap-load="${key}" style="background:#00b894;border:none;color:white;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">Load</button>
                    <button data-snap-del="${key}" style="background:#ff7675;border:none;color:white;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">🗑️</button>
                </div>
            </div>`;
        });
    }

    overlay.innerHTML = `
        <div style="background:#1a1a24;padding:25px;border-radius:12px;width:550px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="color:#f0f0f5;margin:0;">🎭 Snapshot Manager (${snaps.length})</h3>
                <button id="webedit-snap-close" style="background:transparent;border:none;color:#ff7675;font-size:20px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:12px;">
                <button id="webedit-snap-new" style="width:100%;background:#6c5ce7;border:none;color:white;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;">💾 Save New Snapshot</button>
            </div>
            <div style="flex:1;overflow-y:auto;">${listHTML}</div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#webedit-snap-close').onclick = () => overlay.remove();
    overlay.querySelector('#webedit-snap-new').onclick = () => {
        const name = prompt('Enter a name for this snapshot:', 'Snapshot ' + (snaps.length + 1));
        if (name) {
            const key = prefix + name + '_' + Date.now();
            hideToolbar();
            localStorage.setItem(key, document.body.innerHTML);
            showNotification('Snapshot "' + name + '" saved! 🎭', '#6c5ce7');
            overlay.remove();
            openSnapshotManager();
        }
    };
    overlay.querySelectorAll('[data-snap-load]').forEach(btn => {
        btn.onclick = () => {
            const data = localStorage.getItem(btn.dataset.snapLoad);
            if (data) {
                document.body.innerHTML = data;
                showNotification('Snapshot loaded! 🎭', '#00b894');
                if (WebEditState.isEditing) { WebEditState.toolbar = null; createToolbar(); }
            }
            overlay.remove();
        };
    });
    overlay.querySelectorAll('[data-snap-del]').forEach(btn => {
        btn.onclick = () => {
            localStorage.removeItem(btn.dataset.snapDel);
            showNotification('Snapshot deleted!', '#ff7675');
            overlay.remove();
            openSnapshotManager();
        };
    });
}

// --- FEATURE 10: Undo/Redo History ---
const WebEditHistory = { stack: [], index: -1, maxSize: 50 };
function recordHistory() {
    WebEditHistory.stack = WebEditHistory.stack.slice(0, WebEditHistory.index + 1);
    WebEditHistory.stack.push(document.body.innerHTML);
    if (WebEditHistory.stack.length > WebEditHistory.maxSize) WebEditHistory.stack.shift();
    WebEditHistory.index = WebEditHistory.stack.length - 1;
}
function undoHistory() {
    if (WebEditHistory.index > 0) {
        WebEditHistory.index--;
        hideToolbar();
        document.body.innerHTML = WebEditHistory.stack[WebEditHistory.index];
        if (WebEditState.isEditing) { WebEditState.toolbar = null; createToolbar(); }
        showNotification(`Undo (${WebEditHistory.index + 1}/${WebEditHistory.stack.length}) ↩️`, '#6c5ce7');
    } else { showNotification('Nothing to undo!', '#ff7675'); }
}
function redoHistory() {
    if (WebEditHistory.index < WebEditHistory.stack.length - 1) {
        WebEditHistory.index++;
        hideToolbar();
        document.body.innerHTML = WebEditHistory.stack[WebEditHistory.index];
        if (WebEditState.isEditing) { WebEditState.toolbar = null; createToolbar(); }
        showNotification(`Redo (${WebEditHistory.index + 1}/${WebEditHistory.stack.length}) ↪️`, '#00b894');
    } else { showNotification('Nothing to redo!', '#ff7675'); }
}
// Auto-record on mutations (throttled)
let _historyTimer = null;
const _historyObserver = new MutationObserver(() => {
    clearTimeout(_historyTimer);
    _historyTimer = setTimeout(recordHistory, 2000);
});
_historyObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
recordHistory(); // initial state

// --- FEATURE 11: A/B Compare Mode ---
function toggleABCompare() {
    const existing = document.getElementById('webedit-ab-frame');
    if (existing) { existing.remove(); showNotification('A/B Compare closed', '#a0a0b5'); return; }

    const overlay = document.createElement('div');
    overlay.id = 'webedit-ab-frame';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:50vw;height:100vh;z-index:2147483646;border-right:3px solid #6c5ce7;box-shadow:4px 0 20px rgba(0,0,0,0.5);';
    overlay.innerHTML = `
        <div style="position:absolute;top:10px;left:10px;z-index:2147483647;display:flex;gap:8px;">
            <span style="background:#6c5ce7;color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-family:system-ui;">Original</span>
            <button onclick="document.getElementById('webedit-ab-frame').remove()" style="background:#ff7675;border:none;color:white;padding:4px 12px;border-radius:20px;font-size:12px;cursor:pointer;">Close</button>
        </div>
        <iframe src="${window.location.href}" style="width:100%;height:100%;border:none;"></iframe>`;
    document.body.appendChild(overlay);
    showNotification('A/B Compare ON 🔀 — Original on left, your edits on right!', '#6c5ce7');
}

// --- FEATURE 12: Table Editor ---
function handleTableClick(e) {
    const td = e.target.closest('td, th');
    if (!td) return;
    const table = td.closest('table');
    if (!table || document.getElementById('webedit-table-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'webedit-table-bar';
    bar.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1a1a24;padding:8px 12px;border-radius:10px;z-index:2147483647;display:flex;gap:8px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:system-ui;';
    bar.innerHTML = `
        <span style="color:#fdcb6e;font-size:12px;font-weight:bold;">📊 Table</span>
        <button id="we-add-row" style="background:#00b894;border:none;color:white;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">+ Row</button>
        <button id="we-add-col" style="background:#0984e3;border:none;color:white;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">+ Col</button>
        <button id="we-del-row" style="background:#ff7675;border:none;color:white;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">- Row</button>
        <button id="we-del-col" style="background:#e17055;border:none;color:white;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">- Col</button>
        <button id="we-table-close" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:white;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">✕</button>`;
    document.body.appendChild(bar);

    const rowIdx = td.parentElement.rowIndex;
    const colIdx = td.cellIndex;

    bar.querySelector('#we-add-row').onclick = () => {
        const newRow = table.insertRow(rowIdx + 1);
        const cols = table.rows[0] ? table.rows[0].cells.length : 1;
        for (let i = 0; i < cols; i++) { const c = newRow.insertCell(); c.textContent = '—'; c.contentEditable = 'true'; }
        showNotification('Row added!', '#00b894');
    };
    bar.querySelector('#we-add-col').onclick = () => {
        for (let r = 0; r < table.rows.length; r++) {
            const c = table.rows[r].insertCell(colIdx + 1);
            c.textContent = '—'; c.contentEditable = 'true';
        }
        showNotification('Column added!', '#0984e3');
    };
    bar.querySelector('#we-del-row').onclick = () => {
        if (table.rows.length > 1) { table.deleteRow(rowIdx); showNotification('Row deleted!', '#ff7675'); }
    };
    bar.querySelector('#we-del-col').onclick = () => {
        for (let r = 0; r < table.rows.length; r++) {
            if (table.rows[r].cells.length > 1) table.rows[r].deleteCell(colIdx);
        }
        showNotification('Column deleted!', '#e17055');
    };
    bar.querySelector('#we-table-close').onclick = () => bar.remove();
}

let _tableEditActive = false;
function toggleTableEditor() {
    _tableEditActive = !_tableEditActive;
    if (_tableEditActive) {
        document.querySelectorAll('td, th').forEach(cell => { cell.contentEditable = 'true'; cell.style.outline = '1px dashed rgba(253,203,110,0.3)'; });
        document.addEventListener('click', handleTableClick, true);
        showNotification('Table Editor ON 📊 (Click any table cell)', '#fdcb6e');
    } else {
        document.querySelectorAll('td, th').forEach(cell => { cell.contentEditable = 'false'; cell.style.outline = ''; });
        document.removeEventListener('click', handleTableClick, true);
        const bar = document.getElementById('webedit-table-bar');
        if (bar) bar.remove();
        showNotification('Table Editor OFF', '#a0a0b5');
    }
    return _tableEditActive;
}

// --- FEATURE 13: Screen Recording ---
let _mediaRecorder = null;
let _recordedChunks = [];
function toggleScreenRecording() {
    if (_mediaRecorder && _mediaRecorder.state === 'recording') {
        _mediaRecorder.stop();
        showNotification('Recording stopped! Processing... 🎬', '#e84393');
        return false;
    }

    navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen' }, audio: false })
    .then(stream => {
        _recordedChunks = [];
        _mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        _mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) _recordedChunks.push(e.data); };
        _mediaRecorder.onstop = () => {
            const blob = new Blob(_recordedChunks, { type: 'video/webm' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `WebEdit_Recording_${Date.now()}.webm`;
            a.click();
            stream.getTracks().forEach(t => t.stop());
            showNotification('Recording saved! 🎬', '#00b894');
        };
        _mediaRecorder.start();
        showNotification('Recording started... Click again to stop 🔴', '#e84393');
    })
    .catch(() => { showNotification('Screen recording permission denied.', '#ff7675'); });
    return true;
}

// --- FEATURE 14: Translation Mode ---
function translateSelection() {
    const sel = window.getSelection();
    if (!sel || sel.toString().trim() === '') {
        showNotification('Highlight some text first!', '#ff7675');
        return;
    }
    const text = sel.toString().trim();
    const node = sel.anchorNode.parentNode;

    const overlay = document.createElement('div');
    overlay.id = 'webedit-translate-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui;';
    overlay.innerHTML = `
        <div style="background:#1a1a24;padding:25px;border-radius:12px;width:500px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="color:#00cec9;margin:0;">🌐 Translate Text</h3>
                <button id="we-trans-close" style="background:transparent;border:none;color:#ff7675;font-size:20px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:12px;">
                <label style="color:#a0a0b5;font-size:11px;">Original Text</label>
                <div style="background:#0d0d14;color:#f0f0f5;padding:10px;border-radius:6px;font-size:13px;max-height:100px;overflow-y:auto;margin-top:4px;">${text.substring(0, 500)}</div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="color:#a0a0b5;font-size:11px;">Translate to</label>
                <select id="we-trans-lang" style="width:100%;background:#0d0d14;color:#f0f0f5;border:1px solid rgba(255,255,255,0.1);padding:8px;border-radius:6px;margin-top:4px;">
                    <option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option>
                    <option value="hi">Hindi</option><option value="ja">Japanese</option><option value="zh">Chinese</option>
                    <option value="ar">Arabic</option><option value="pt">Portuguese</option><option value="ru">Russian</option>
                    <option value="ko">Korean</option><option value="it">Italian</option>
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="color:#a0a0b5;font-size:11px;">Translation</label>
                <textarea id="we-trans-result" style="width:100%;height:80px;background:#0d0d14;color:#a3f7bf;padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);font-size:13px;resize:none;outline:none;margin-top:4px;box-sizing:border-box;" placeholder="Click Translate to see result..."></textarea>
            </div>
            <div style="display:flex;gap:8px;">
                <button id="we-trans-go" style="flex:1;background:#00cec9;border:none;color:white;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;">Translate</button>
                <button id="we-trans-apply" style="flex:1;background:#6c5ce7;border:none;color:white;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;">Apply to Page</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#we-trans-close').onclick = () => overlay.remove();
    overlay.querySelector('#we-trans-go').onclick = () => {
        const lang = overlay.querySelector('#we-trans-lang').value;
        const encoded = encodeURIComponent(text.substring(0, 1000));
        // Use free MyMemory translation API
        fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${lang}`)
        .then(r => r.json())
        .then(data => {
            const translated = data.responseData ? data.responseData.translatedText : 'Translation failed.';
            overlay.querySelector('#we-trans-result').value = translated;
        })
        .catch(() => {
            overlay.querySelector('#we-trans-result').value = '[Error] Could not connect to translation service.';
        });
    };
    overlay.querySelector('#we-trans-apply').onclick = () => {
        const result = overlay.querySelector('#we-trans-result').value;
        if (result && node) {
            node.textContent = result;
            showNotification('Translation applied to page! 🌐', '#00cec9');
        }
        overlay.remove();
    };
}

// --- FEATURE 15: AI Text Rewriter ---
function aiRewriteText() {
    const sel = window.getSelection();
    if (!sel || sel.toString().trim() === '') {
        showNotification('Highlight some text first!', '#ff7675');
        return;
    }
    const text = sel.toString().trim();
    const node = sel.anchorNode.parentNode;

    const overlay = document.createElement('div');
    overlay.id = 'webedit-ai-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui;';
    overlay.innerHTML = `
        <div style="background:#1a1a24;padding:25px;border-radius:12px;width:520px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="color:#e84393;margin:0;">🤖 AI Text Rewriter</h3>
                <button id="we-ai-close" style="background:transparent;border:none;color:#ff7675;font-size:20px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:12px;">
                <label style="color:#a0a0b5;font-size:11px;">Original Text</label>
                <textarea id="we-ai-original" style="width:100%;height:80px;background:#0d0d14;color:#f0f0f5;padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);font-size:13px;resize:none;outline:none;margin-top:4px;box-sizing:border-box;">${text.substring(0, 500)}</textarea>
            </div>
            <div style="margin-bottom:12px;">
                <label style="color:#a0a0b5;font-size:11px;">Rewrite Style</label>
                <select id="we-ai-style" style="width:100%;background:#0d0d14;color:#f0f0f5;border:1px solid rgba(255,255,255,0.1);padding:8px;border-radius:6px;margin-top:4px;">
                    <option value="professional">Professional</option>
                    <option value="casual">Casual & Friendly</option>
                    <option value="formal">Formal & Academic</option>
                    <option value="concise">Short & Concise</option>
                    <option value="creative">Creative & Engaging</option>
                    <option value="persuasive">Persuasive & Marketing</option>
                    <option value="simple">Simple & Easy to Read</option>
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="color:#a0a0b5;font-size:11px;">Rewritten Text</label>
                <textarea id="we-ai-result" style="width:100%;height:100px;background:#0d0d14;color:#a3f7bf;padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);font-size:13px;resize:none;outline:none;margin-top:4px;box-sizing:border-box;" placeholder="Click Rewrite to generate..."></textarea>
            </div>
            <div style="display:flex;gap:8px;">
                <button id="we-ai-rewrite" style="flex:1;background:#e84393;border:none;color:white;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;">🤖 Rewrite</button>
                <button id="we-ai-apply" style="flex:1;background:#00b894;border:none;color:white;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;">✅ Apply</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#we-ai-close').onclick = () => overlay.remove();
    overlay.querySelector('#we-ai-rewrite').onclick = () => {
        const style = overlay.querySelector('#we-ai-style').value;
        const original = overlay.querySelector('#we-ai-original').value;
        const resultBox = overlay.querySelector('#we-ai-result');
        resultBox.value = 'Rewriting...';

        // Smart local rewriting engine (no API needed)
        const sentences = original.split(/(?<=[.!?])\s+/);
        let rewritten = '';
        
        if (style === 'professional') {
            rewritten = sentences.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            rewritten = rewritten.replace(/\bvery\b/gi, 'significantly').replace(/\bgood\b/gi, 'excellent').replace(/\bbad\b/gi, 'suboptimal').replace(/\bbig\b/gi, 'substantial').replace(/\bget\b/gi, 'obtain').replace(/\buse\b/gi, 'utilize');
        } else if (style === 'casual') {
            rewritten = original.toLowerCase().replace(/\bhowever\b/gi, 'but').replace(/\btherefore\b/gi, 'so').replace(/\butilize\b/gi, 'use').replace(/\bobtain\b/gi, 'get').replace(/\bpurchase\b/gi, 'buy');
            rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
        } else if (style === 'concise') {
            rewritten = sentences.filter(s => s.split(' ').length > 2).map(s => {
                return s.replace(/\bin order to\b/gi, 'to').replace(/\bdue to the fact that\b/gi, 'because').replace(/\bat this point in time\b/gi, 'now').replace(/\bin the event that\b/gi, 'if');
            }).join(' ');
        } else if (style === 'formal') {
            rewritten = original.replace(/\bcan't\b/gi, 'cannot').replace(/\bwon't\b/gi, 'will not').replace(/\bdon't\b/gi, 'do not').replace(/\bisn't\b/gi, 'is not').replace(/\baren't\b/gi, 'are not').replace(/\bwouldn't\b/gi, 'would not').replace(/\bI'm\b/g, 'I am').replace(/\bwe're\b/gi, 'we are').replace(/\bthey're\b/gi, 'they are');
        } else if (style === 'creative') {
            const adjectives = ['remarkable', 'extraordinary', 'fascinating', 'stunning', 'brilliant'];
            rewritten = original.replace(/\b(good|nice|great)\b/gi, () => adjectives[Math.floor(Math.random() * adjectives.length)]);
            rewritten = '✨ ' + rewritten;
        } else if (style === 'persuasive') {
            rewritten = 'Here\'s the truth: ' + original.replace(/\./g, '!') + ' Don\'t miss out — act now!';
        } else {
            rewritten = sentences.map(s => {
                const words = s.split(' ');
                return words.filter(w => w.length <= 10 || Math.random() > 0.5).join(' ');
            }).join('. ') + '.';
        }
        
        resultBox.value = rewritten;
    };
    overlay.querySelector('#we-ai-apply').onclick = () => {
        const result = overlay.querySelector('#we-ai-result').value;
        if (result && node) {
            node.textContent = result;
            showNotification('Rewritten text applied! 🤖', '#e84393');
        }
        overlay.remove();
    };
}

// --- Message Router (SECURITY LEVEL 7: SENDER AUTHENTICATION) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (sender.id && sender.id !== chrome.runtime.id) return; // Block malicious cross-extension injections
    switch (request.action) {
        case "get_state":
            sendResponse({
                isEditing: WebEditState.isEditing,
                isErasing: WebEditState.isErasing,
                isDarkMode: WebEditState.isDarkMode,
                isXRaying: WebEditState.isXRaying,
                isCloning: WebEditState.isCloning,
                isCleanPrint: WebEditState.isCleanPrint,
                isCSSInspecting: WebEditState.isCSSInspecting,
                isLinkEditing: WebEditState.isLinkEditing,
                isAnnotating: WebEditState.isAnnotating,
                isDragging: WebEditState.isDragging
            });
            break;
        case "toggle_edit": sendResponse({ isEditing: toggleEditMode() }); break;
        case "toggle_eraser": sendResponse({ isErasing: toggleEraserMode() }); break;
        case "toggle_clone": sendResponse({ isCloning: toggleCloneMode() }); break;
        case "toggle_xray": sendResponse({ isXRaying: toggleXRayMode() }); break;
        case "toggle_cleanprint": sendResponse({ isCleanPrint: toggleCleanPrintMode() }); break;
        case "toggle_dark": sendResponse({ isDarkMode: toggleDarkMode() }); break;
        case "toggle_css": sendResponse({ isCSSInspecting: toggleCSSInspector() }); break;
        case "toggle_link": sendResponse({ isLinkEditing: toggleLinkEditor() }); break;
        case "toggle_annotate": sendResponse({ isAnnotating: toggleAnnotationMode() }); break;
        case "toggle_drag": sendResponse({ isDragging: toggleDragMode() }); break;
        case "screenshot": captureFullPageScreenshot(); sendResponse({ success: true }); break;
        case "word_count": showWordCounter(); sendResponse({ success: true }); break;
        case "copy_code": copyElementAsCode(); sendResponse({ success: true }); break;
        case "responsive_preview": toggleResponsivePreview(request.size || 'mobile'); sendResponse({ success: true }); break;
        case "snapshot_manager": openSnapshotManager(); sendResponse({ success: true }); break;
        case "undo": undoHistory(); sendResponse({ success: true }); break;
        case "redo": redoHistory(); sendResponse({ success: true }); break;
        case "ab_compare": toggleABCompare(); sendResponse({ success: true }); break;
        case "toggle_table": sendResponse({ isTableEditing: toggleTableEditor() }); break;
        case "screen_record": toggleScreenRecording(); sendResponse({ success: true }); break;
        case "translate": translateSelection(); sendResponse({ success: true }); break;
        case "ai_rewrite": aiRewriteText(); sendResponse({ success: true }); break;
        case "save_state": savePageState(); sendResponse({ success: true }); break;
        case "restore_state": restorePageState(); sendResponse({ success: true }); break;
        case "export_pdf": printAsPDF(); sendResponse({ success: true }); break;
        case "export_popup_selection": 
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && sel.toString().trim() !== '') {
                const node = sel.anchorNode.parentNode;
                if (node && node !== document.body && node !== document.documentElement) {
                    node.classList.add('webedit-print-target');
                    const printStyle = document.createElement('style');
                    printStyle.id = 'webedit-print-selection-style';
                    printStyle.innerHTML = `
                        @media print {
                            body * { visibility: hidden !important; }
                            .webedit-print-target, .webedit-print-target * { visibility: visible !important; }
                            .webedit-print-target { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; }
                        }
                    `;
                    document.head.appendChild(printStyle);
                    const wasEditing = WebEditState.isEditing;
                    if (wasEditing) { document.designMode = 'off'; hideToolbar(); }
                    window.print();
                    node.classList.remove('webedit-print-target');
                    printStyle.remove();
                    if (wasEditing) document.designMode = 'on';
                    showNotification('Selection PDF Exported Successfully! 🖨️', '#00b894');
                }
            } else {
                alert("Please highlight some text on the screen first before clicking Export Selection!");
            }
            sendResponse({ success: true }); 
            break;
    }
});

// --- Auto-Unlock System ---
// TODO: Replace with your own payment verification system. 
// Use chrome.storage.local.set({ _weAuthToken: btoa('YOUR_SECRET_KEY') }) to unlock.


} // end of re-injection guard
