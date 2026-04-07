const WebEditState = {
    isEditing: false,
    isErasing: false,
    isDarkMode: false,
    isXRaying: false,
    isCloning: false,
    isCleanPrint: false,
    toolbar: null,
    lastSelectionRange: null,
    hoverElement: null
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
        showNotification('DOM Snapshot Saved! ðŸ’¾', '#00b894');
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
            showNotification('Edits Restored Successfully! ðŸ”„', '#00b894');
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
        showNotification('Dark Mode ON ðŸŒ™', '#2c3e50');
    } else {
        document.documentElement.style.filter = '';
        const style = document.getElementById('webedit-darkmode-style');
        if (style) style.remove();
        showNotification('Dark Mode OFF â˜€ï¸', '#f39c12');
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
        showNotification('Clean-Print Mode ON ðŸ“„ (Images/Colors hidden)', '#2c3e50');
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
        showNotification('Magic Eraser ON ðŸ§¹ (Click items to vanish)', '#ff7675');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleEraserHover, true);
        document.removeEventListener('click', handleEraserClick, true);
        document.body.style.cursor = 'default';
        showNotification('Magic Eraser OFF ðŸ”’', '#00b894');
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
        showNotification('Element Duplicated! ðŸ‘¯', '#00b894');
    }
}
function toggleCloneMode() {
    WebEditState.isCloning = !WebEditState.isCloning;
    if (WebEditState.isCloning) {
        disableConflictingModes('clone');
        document.addEventListener('mouseover', handleCloneHover, true);
        document.addEventListener('click', handleCloneClick, true);
        document.body.style.cursor = 'copy';
        showNotification('Element Cloner ON ðŸ‘¯ (Click to duplicate)', '#00b894');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleCloneHover, true);
        document.removeEventListener('click', handleCloneClick, true);
        document.body.style.cursor = 'default';
        showNotification('Element Cloner OFF ðŸ”’', '#ff7675');
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
    header.textContent = 'ðŸ” HTML X-Ray Editor';
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
            showNotification('HTML Live Updated! âœ¨', '#00b894');
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
        showNotification('HTML X-Ray ON ðŸ” (Click item to edit code)', '#0984e3');
    } else {
        if (WebEditState.hoverElement) WebEditState.hoverElement.style.outline = '';
        document.removeEventListener('mouseover', handleXRayHover, true);
        document.removeEventListener('click', handleXRayClick, true);
        document.body.style.cursor = 'default';
        showNotification('HTML X-Ray OFF ðŸ”’', '#ff7675');
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
                    showNotification('Image Swapped Successfully! ðŸ–¼ï¸', '#00b894');
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
        <button data-command="undo" title="Undo (Ctrl+Z)">â†©ï¸</button>
        <button data-command="redo" title="Redo (Ctrl+Y)">â†ªï¸</button>
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
            <span>ðŸ–ï¸</span><input type="color" class="color-input" data-command="hiliteColor" value="#ffff00">
        </div>
        <div class="webedit-divider"></div>
        <button data-command="insertImageFile" title="Upload New Image">ðŸ–¼ï¸</button>
        <button data-command="exportSelection" title="Export Only Selected Area to PDF" style="color:#00b894;">ðŸ–¨ï¸</button>
        <div class="webedit-divider"></div>
        <button data-command="removeFormat" title="Clear Formatting">ðŸ§¹</button>
        <button data-command="delete" title="Delete Element" style="color:#ff7675;">ðŸ—‘ï¸</button>
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
                        showNotification('Selection PDF Exported Successfully! ðŸ–¨ï¸', '#00b894');
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
                            showNotification('Image Inserted! ðŸ–¼ï¸', '#00b894');
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
        showNotification('Edit Mode Enabled âœ¨ (Highlight text or double-click items)', '#00b894');
    } else {
        document.designMode = 'off';
        document.removeEventListener('dblclick', handleImageDoubleClick);
        document.removeEventListener('mouseup', handleSelectionChange);
        document.removeEventListener('keyup', handleSelectionChange);
        hideToolbar();
        showNotification('Edit Mode Disabled ðŸ”’', '#a0a0b5');
    }
    return WebEditState.isEditing;
}
function printAsPDF() { hideToolbar(); window.print(); }

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
                isCleanPrint: WebEditState.isCleanPrint
            });
            break;
        case "toggle_edit": sendResponse({ isEditing: toggleEditMode() }); break;
        case "toggle_eraser": sendResponse({ isErasing: toggleEraserMode() }); break;
        case "toggle_clone": sendResponse({ isCloning: toggleCloneMode() }); break;
        case "toggle_xray": sendResponse({ isXRaying: toggleXRayMode() }); break;
        case "toggle_cleanprint": sendResponse({ isCleanPrint: toggleCleanPrintMode() }); break;
        case "toggle_dark": sendResponse({ isDarkMode: toggleDarkMode() }); break;
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
                    showNotification('Selection PDF Exported Successfully! ðŸ–¨ï¸', '#00b894');
                }
            } else {
                alert("Please highlight some text on the screen first before clicking Export Selection!");
            }
            sendResponse({ success: true }); 
            break;
    }
});

// --- Auto-Unlock System ---
// TODO: Replace with your own payment webhook URL detection logic.
// See README.md for setup instructions.

