(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Keep account bootstrap data in HTML meta tags so it is compatible with
        // the site's strict Content-Security-Policy (no inline JavaScript).
        const metaValue = name => document.querySelector(`meta[name=\"${name}\"]`)?.getAttribute('content') || '';
        window.MJ_ACCOUNT = {
            name: metaValue('mj-account-name'),
            email: metaValue('mj-account-email'),
            joined: metaValue('mj-account-joined'),
            csrfToken: metaValue('mj-account-csrf')
        };
        const root = document.body;
        const sidebar = document.querySelector('.account-center-sidebar');
        const sidebarToggle = document.getElementById('ac-sidebar-toggle');
        const sidebarBackdrop = document.getElementById('ac-sidebar-backdrop');
        const closeSidebar = () => {
            if (!sidebar) return;
            sidebar.classList.remove('ac-sidebar-open');
            root.classList.remove('ac-menu-open');
            sidebarToggle?.setAttribute('aria-expanded','false');
            sidebarToggle?.setAttribute('aria-label','Open account menu');
        };
        const openSidebar = () => {
            if (!sidebar) return;
            sidebar.classList.add('ac-sidebar-open');
            root.classList.add('ac-menu-open');
            sidebarToggle?.setAttribute('aria-expanded','true');
            sidebarToggle?.setAttribute('aria-label','Close account menu');
        };
        sidebarToggle?.addEventListener('click', () => sidebar?.classList.contains('ac-sidebar-open') ? closeSidebar() : openSidebar());
        sidebarBackdrop?.addEventListener('click', closeSidebar);
        const navItems = [...document.querySelectorAll('[data-ac-view]')];
        const panels = [...document.querySelectorAll('[data-ac-panel]')];
        const modal = document.getElementById('ac-modal-backdrop');
        const modalBody = document.getElementById('ac-modal-body');
        const modalTitle = document.getElementById('ac-modal-title');
        const closeModal = () => { if (modal) { modal.hidden = true; modalBody.innerHTML = ''; } };
        const storageKey = 'mjAccountCenter';
        const defaults = { privateProfile:true, personalized:true, activityHistory:true, securityAlerts:true, productUpdates:true, messages:true, profileSync:true, savedPreferences:true, relevantAds:true, activityAds:false, twoFA:false };
        let settings = defaults;
        try { settings = { ...defaults, ...(JSON.parse(localStorage.getItem(storageKey) || '{}').settings || {}) }; } catch {}

        function save() {
            try { localStorage.setItem(storageKey, JSON.stringify({ settings })); } catch {}
        }
        function showView(view) {
            panels.forEach(p => p.classList.toggle('active', p.dataset.acPanel === view));
            navItems.forEach(n => n.classList.toggle('active', n.dataset.acView === view));
            if (view === 'activity') renderActivity();
            if (window.matchMedia('(max-width: 900px)').matches) closeSidebar();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        navItems.forEach(item => item.addEventListener('click', () => showView(item.dataset.acView)));

        document.querySelectorAll('[data-setting]').forEach(input => {
            const key = input.dataset.setting;
            input.checked = Boolean(settings[key]);
            input.addEventListener('change', () => { settings[key] = input.checked; save(); });
        });
        const twoFA = document.getElementById('security-2fa');
        if (twoFA) { twoFA.checked = Boolean(settings.twoFA); twoFA.addEventListener('change', () => { settings.twoFA = twoFA.checked; save(); }); }

        function getActivity() {
            try { return JSON.parse(localStorage.getItem('mjLoginActivity') || '[]'); } catch { return []; }
        }
        function renderActivity() {
            const box = document.getElementById('login-activity-list'); if (!box) return;
            const activity = getActivity();
            if (!activity.length) { box.innerHTML = '<div class="ac-empty"><span>◷</span><strong>No recent activity</strong><small>Your current browser activity will appear here after sign-in.</small></div>'; return; }
            box.innerHTML = activity.slice(0, 8).map((a, i) => `<div class="ac-setting-row"><div><strong>${escapeHtml(a.device || 'This browser')}${i === 0 ? ' · Current' : ''}</strong><small>${escapeHtml(a.time || '')}</small></div><span class="ac-verified">${i === 0 ? 'Active now' : 'Signed in'}</span></div>`).join('');
        }
        function recordActivity() {
            const now = new Date();
            const item = { device: navigator.userAgent.includes('Chrome') ? 'Chrome browser' : 'Web browser', time: now.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) };
            const list = getActivity().filter(a => a.device !== item.device || a.time !== item.time);
            list.unshift(item);
            try { localStorage.setItem('mjLoginActivity', JSON.stringify(list.slice(0, 8))); } catch {}
        }
        recordActivity();

        function escapeHtml(v) { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
        async function post(mode, data, retried = false) {
            const body = new URLSearchParams(data || {});
            if (window.MJ_ACCOUNT?.csrfToken) body.set('csrf_token', window.MJ_ACCOUNT.csrfToken);
            const response = await fetch(`php/auth.php?mode=${encodeURIComponent(mode)}`, { method:'POST', headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'}, credentials:'same-origin', cache:'no-store', body });
            const json = await response.json().catch(() => ({ success:false, message:'Unexpected server response.' }));
            // If the page was left open while the PHP session/token changed, refresh the
            // token once and retry. This prevents the false CSRF error on delete/password actions.
            if (!retried && response.status === 403 && json.message === 'Security check failed. Please refresh and try again.') {
                const tokenResponse = await fetch(`php/auth.php?mode=status&_=${Date.now()}`, { credentials:'same-origin', cache:'no-store', headers:{'Accept':'application/json'} });
                const tokenData = await tokenResponse.json().catch(() => ({}));
                if (tokenData.csrf_token) {
                    if (window.MJ_ACCOUNT && typeof window.MJ_ACCOUNT === 'object') {
                        window.MJ_ACCOUNT.csrfToken = tokenData.csrf_token;
                    }
                    return post(mode, data, true);
                }
            }
            if (!response.ok || !json.success) throw new Error(json.message || 'Request failed.');
            return json;
        }

        function openPasswordModal() {
            modalTitle.textContent = 'Change password';
            modalBody.innerHTML = `<form id="change-password-form" class="ac-modal-form">
                <div class="form-group password-wrap"><label for="ac-current-password">Current password</label><input id="ac-current-password" name="current_password" type="password" minlength="8" maxlength="128" required autocomplete="current-password"><button class="password-toggle ac-password-toggle" type="button" data-ac-password-toggle="ac-current-password" aria-label="Show password">◉</button></div>
                <div class="form-group password-wrap"><label for="ac-new-password">New password</label><input id="ac-new-password" name="new_password" type="password" minlength="10" maxlength="128" required autocomplete="new-password"><button class="password-toggle ac-password-toggle" type="button" data-ac-password-toggle="ac-new-password" aria-label="Show password">◉</button></div>
                <div class="form-group password-wrap"><label for="ac-confirm-password">Confirm new password</label><input id="ac-confirm-password" name="confirm_password" type="password" minlength="10" maxlength="128" required autocomplete="new-password"><button class="password-toggle ac-password-toggle" type="button" data-ac-password-toggle="ac-confirm-password" aria-label="Show password">◉</button></div>
                <button class="btn btn-primary full" type="submit">Update password</button><div class="form-status" id="modal-status"></div></form>`;
            modal.hidden = false;
            document.getElementById('change-password-form').addEventListener('submit', async e => {
                e.preventDefault(); const form = e.currentTarget; const status = document.getElementById('modal-status'); const fd = new FormData(form);
                if (fd.get('new_password') !== fd.get('confirm_password')) { status.textContent='New passwords do not match.'; status.className='form-status error'; return; }
                try { await post('change_password', { current_password:fd.get('current_password'), new_password:fd.get('new_password') }); status.textContent='Password updated successfully.'; status.className='form-status success'; setTimeout(closeModal, 900); }
                catch (err) { status.textContent=err.message; status.className='form-status error'; }
            });
        }
        function openNameModal() {
            modalTitle.textContent = 'Edit profile name';
            modalBody.innerHTML = `<form id="edit-name-form" class="ac-modal-form"><label>Name<input name="name" type="text" maxlength="80" required value="${escapeHtml(window.MJ_ACCOUNT.name)}" autocomplete="name"></label><button class="btn btn-primary full" type="submit">Save changes</button><div class="form-status" id="modal-status"></div></form>`;
            modal.hidden = false;
            document.getElementById('edit-name-form').addEventListener('submit', async e => {
                e.preventDefault(); const status = document.getElementById('modal-status'); const name = new FormData(e.currentTarget).get('name');
                try { const result = await post('update_profile', { name }); window.MJ_ACCOUNT.name=result.name; document.querySelectorAll('.ac-profile-mini strong,.ac-hero-copy h1').forEach(x=>x.textContent=result.name); document.getElementById('profile-name-value').textContent=result.name; status.textContent='Profile updated.'; status.className='form-status success'; setTimeout(closeModal, 700); }
                catch (err) { status.textContent=err.message; status.className='form-status error'; }
            });
        }
        function openDeleteModal() {
            modalTitle.textContent = 'Delete account';
            modalBody.innerHTML = `<p class="ac-danger-copy">This permanently removes your MJ account. This action cannot be undone.</p><form id="delete-account-form" class="ac-modal-form"><div class="form-group password-wrap"><label for="ac-delete-password">Enter your password</label><input id="ac-delete-password" name="password" type="password" minlength="8" maxlength="128" required autocomplete="current-password"><button class="password-toggle ac-password-toggle" type="button" data-ac-password-toggle="ac-delete-password" aria-label="Show password">◉</button></div><button class="btn btn-danger full" type="submit">Permanently delete account</button><div class="form-status" id="modal-status"></div></form>`;
            modal.hidden = false;
            document.getElementById('delete-account-form').addEventListener('submit', async e => {
                e.preventDefault(); const status=document.getElementById('modal-status'); const password=new FormData(e.currentTarget).get('password');
                try {
                    status.textContent = 'Deleting your account securely…';
                    status.className = 'form-status success';
                    const result = await post('delete_account',{password});
                    localStorage.removeItem(storageKey);
                    localStorage.removeItem('mjLoginActivity');
                    status.textContent = result.message || 'Your account has been permanently deleted.';
                    status.className = 'form-status success';
                    const form = document.getElementById('delete-account-form');
                    if (form) form.querySelectorAll('input,button').forEach(el => el.disabled = true);
                    setTimeout(() => { window.location.href='index.html'; }, 1800);
                } catch(err){
                    status.textContent = err.message || 'We could not complete the account deletion. Please try again.';
                    status.className = 'form-status error';
                }
            });
        }
        document.querySelectorAll('[data-modal="password"]').forEach(b => b.addEventListener('click', openPasswordModal));
        document.querySelectorAll('[data-edit="name"]').forEach(b => b.addEventListener('click', openNameModal));
        document.querySelectorAll('[data-modal="delete"]').forEach(b => b.addEventListener('click', openDeleteModal));
        modalBody?.addEventListener('click', e => {
            const toggle = e.target.closest('[data-ac-password-toggle]');
            if (!toggle) return;
            const input = document.getElementById(toggle.dataset.acPasswordToggle);
            if (!input) return;
            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            toggle.textContent = showPassword ? '○' : '◉';
            toggle.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
        });

        document.getElementById('ac-modal-close')?.addEventListener('click', closeModal);
        modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeSidebar(); } });
        window.addEventListener('resize', () => { if (!window.matchMedia('(max-width: 900px)').matches) closeSidebar(); });

        document.querySelectorAll('[data-ac-action="clear"]').forEach(b => b.addEventListener('click', () => {
            localStorage.removeItem('mjLoginActivity'); localStorage.removeItem(storageKey); settings={...defaults}; save(); document.querySelectorAll('[data-setting]').forEach(i=>i.checked=Boolean(settings[i.dataset.setting])); alert('Local MJ activity and preferences were cleared.');
        }));
        document.querySelectorAll('[data-ac-action="export"]').forEach(b => b.addEventListener('click', () => {
            // Export as a clean, human-readable PNG image instead of JSON/code.
            // The image contains only account information/settings and is not an editable text file.
            const account = window.MJ_ACCOUNT || {};
            const activity = getActivity();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const width = 1400;
            const pad = 90;
            const lineH = 42;
            const sections = [
                ['MJ ACCOUNT INFORMATION', [
                    `Name: ${account.name || '—'}`,
                    `Email: ${account.email || '—'}`,
                    `Member since: ${account.joined || '—'}`
                ]],
                ['ACCOUNT SETTINGS', [
                    `Private profile: ${settings.privateProfile ? 'On' : 'Off'}`,
                    `Personalized experience: ${settings.personalized ? 'On' : 'Off'}`,
                    `Activity history: ${settings.activityHistory ? 'On' : 'Off'}`,
                    `Security alerts: ${settings.securityAlerts ? 'On' : 'Off'}`,
                    `Product updates: ${settings.productUpdates ? 'On' : 'Off'}`,
                    `Messages: ${settings.messages ? 'On' : 'Off'}`,
                    `Profile sync: ${settings.profileSync ? 'On' : 'Off'}`,
                    `Saved preferences: ${settings.savedPreferences ? 'On' : 'Off'}`,
                    `Two-step protection: ${settings.twoFA ? 'On' : 'Off'}`
                ]],
                ['RECENT LOGIN ACTIVITY', activity.length ? activity.slice(0, 8).map(a => `${a.device || 'Web browser'} — ${a.time || ''}`) : ['No recent activity']]
            ];

            const wrap = (text, maxWidth) => {
                const words = String(text).split(' '); const lines=[]; let line='';
                words.forEach(word => { const test=line ? `${line} ${word}` : word; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line=word; } else line=test; });
                if (line) lines.push(line); return lines;
            };

            let height = 250;
            sections.forEach(([title, rows]) => { height += 76 + rows.reduce((n,row) => n + wrap(row, width-pad*2).length * lineH, 0) + 30; });
            height += 100;
            canvas.width = width; canvas.height = height;

            ctx.fillStyle = '#0b0d10'; ctx.fillRect(0,0,width,height);
            const glow = ctx.createRadialGradient(width/2,120,20,width/2,120,620);
            glow.addColorStop(0,'rgba(215,184,102,.16)'); glow.addColorStop(1,'rgba(215,184,102,0)');
            ctx.fillStyle=glow; ctx.fillRect(0,0,width,300);
            ctx.strokeStyle='rgba(215,184,102,.45)'; ctx.lineWidth=2; ctx.strokeRect(28,28,width-56,height-56);
            ctx.fillStyle='#d7b866'; ctx.font='700 46px Arial, sans-serif'; ctx.fillText('MJ',pad,105);
            ctx.fillStyle='#f3f1eb'; ctx.font='700 34px Arial, sans-serif'; ctx.fillText('ACCOUNT INFORMATION',pad,155);
            ctx.fillStyle='rgba(243,241,235,.58)'; ctx.font='20px Arial, sans-serif'; ctx.fillText('Human-readable account summary',pad,190);

            let y=250;
            sections.forEach(([title, rows]) => {
                ctx.fillStyle='#d7b866'; ctx.font='700 22px Arial, sans-serif'; ctx.fillText(title,pad,y); y+=48;
                rows.forEach(row => {
                    ctx.fillStyle='#f3f1eb'; ctx.font='22px Arial, sans-serif';
                    wrap(row,width-pad*2).forEach(line => { ctx.fillText(line,pad,y); y+=lineH; });
                    y+=8;
                });
                ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.beginPath(); ctx.moveTo(pad,y+4); ctx.lineTo(width-pad,y+4); ctx.stroke(); y+=34;
            });
            ctx.fillStyle='rgba(243,241,235,.45)'; ctx.font='18px Arial, sans-serif';
            ctx.fillText(`Generated ${new Date().toLocaleString()}`,pad,height-65);
            ctx.fillText('MJ • Account Center',width-pad-210,height-65);

            canvas.toBlob(blob => {
                if (!blob) return;
                const url=URL.createObjectURL(blob); const a=document.createElement('a');
                a.href=url; const safeUser=String(account.name||'MJ-User').trim().replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'MJ-User'; a.download=`mj-account-information-${safeUser}.png`; document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, 'image/png');
        }));

        const logout = document.getElementById('account-center-logout');
        logout?.addEventListener('click', async () => {
            logout.disabled = true;
            const originalText = logout.textContent;
            logout.textContent = 'Signing out…';
            try {
                // Always fetch the current session token immediately before logout.
                // This avoids stale-token failures when the Account Center was left open.
                const tokenResponse = await fetch(`php/auth.php?mode=status&_=${Date.now()}`, {
                    credentials:'same-origin', cache:'no-store', headers:{'Accept':'application/json'}
                });
                const tokenData = await tokenResponse.json().catch(() => ({}));
                if (tokenData.csrf_token && window.MJ_ACCOUNT && typeof window.MJ_ACCOUNT === 'object') {
                    window.MJ_ACCOUNT.csrfToken = tokenData.csrf_token;
                }
                await post('logout');
                localStorage.removeItem('mjLoginActivity');
                localStorage.removeItem(storageKey);
                window.location.replace('index.html');
            } catch (err) {
                logout.disabled = false;
                logout.textContent = originalText || 'Log out';
                const message = err?.message || 'Could not sign out. Please try again.';
                alert(message);
            }
        });
    });
})();
