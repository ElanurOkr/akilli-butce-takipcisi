// Bütçe Takip Sistemi
class BudgetTracker {
    constructor() {
        this.transactions = [];
        this.goals = [];
        this.currentFilter = 'all';
        this.transactionType = 'income';
        this.sortBy = 'date';
        this.sortOrder = 'desc';
        this.searchTerm = '';
        this.chartPeriod = 'month';
        this.isDarkMode = false;
        this.categoryChart = null;
        this.trendChart = null;
        this.notifiedThresholds = {};
        this._lastDeleted = null;
        this._undoTimer = null;
        this.currentUser = this.loadCurrentUser();
        this.settings = this.loadSettings();

        this.categories = {
            income: [
                { name: 'Maaş', icon: 'fa-briefcase', color: '#10b981' },
                { name: 'Freelance', icon: 'fa-laptop', color: '#059669' },
                { name: 'Yatırım', icon: 'fa-chart-line', color: '#047857' },
                { name: 'Hediye', icon: 'fa-gift', color: '#065f46' },
                { name: 'Diğer Gelir', icon: 'fa-plus-circle', color: '#064e3b' }
            ],
            expense: [
                { name: 'Market', icon: 'fa-shopping-cart', color: '#ef4444' },
                { name: 'Eğlence', icon: 'fa-film', color: '#f97316' },
                { name: 'Ulaşım', icon: 'fa-car', color: '#eab308' },
                { name: 'Faturalar', icon: 'fa-file-invoice', color: '#84cc16' },
                { name: 'Sağlık', icon: 'fa-heartbeat', color: '#22c55e' },
                { name: 'Eğitim', icon: 'fa-graduation-cap', color: '#06b6d4' },
                { name: 'Giyim', icon: 'fa-tshirt', color: '#3b82f6' },
                { name: 'Kira', icon: 'fa-home', color: '#6366f1' },
                { name: 'Diğer Gider', icon: 'fa-minus-circle', color: '#8b5cf6' }
            ]
        };

        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.setDefaultDate();
        this.updateCategoryOptions();
        // Ayarları uygula
        if (this.settings && this.settings.defaultPeriod) {
            this.chartPeriod = this.settings.defaultPeriod;
        }
        if (this.settings && this.settings.defaultType) {
            this.setTransactionType(this.settings.defaultType);
        }
        this.initCharts();
        this.loadDarkMode();
        this.updateUI();
        this.refreshAuthUI();
        // Renk teması uygula
        try {
            const color = (this.settings && this.settings.accentColor) ? this.settings.accentColor : '#6366f1';
            document.documentElement.style.setProperty('--accent', color);
        } catch (_) { }
        this.animateOnLoad();
    }

    setupEventListeners() {
        // Form gönderimi
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // İşlem tipi butonları
        document.getElementById('incomeBtn').addEventListener('click', () => {
            this.setTransactionType('income');
        });

        document.getElementById('expenseBtn').addEventListener('click', () => {
            this.setTransactionType('expense');
        });

        // Filtre butonları
        document.getElementById('filterAll').addEventListener('click', () => {
            this.setFilter('all');
        });

        document.getElementById('filterIncome').addEventListener('click', () => {
            this.setFilter('income');
        });

        document.getElementById('filterExpense').addEventListener('click', () => {
            this.setFilter('expense');
        });

        // Sıralama butonları
        document.getElementById('sortByDate').addEventListener('click', () => {
            this.setSortBy('date');
        });

        document.getElementById('sortByAmount').addEventListener('click', () => {
            this.setSortBy('amount');
        });

        // Arama
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const val = e.target.value || '';
            this.searchTerm = val.toLowerCase();
            const hdr = document.getElementById('headerSearch');
            if (hdr && hdr.value !== val) hdr.value = val;
            this.renderTransactions();
        });

        // Header arama senkronizasyonu
        const headerSearch = document.getElementById('headerSearch');
        if (headerSearch) {
            headerSearch.addEventListener('input', (e) => {
                const val = e.target.value || '';
                this.searchTerm = val.toLowerCase();
                const main = document.getElementById('searchInput');
                if (main && main.value !== val) main.value = val;
                this.renderTransactions();
            });
        }

        // Grafik periyodu
        document.getElementById('chartPeriod').addEventListener('change', (e) => {
            this.chartPeriod = e.target.value;
            this.updateChart();
        });

        // Karanlık mod değiştirme
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // Dışa/içe aktarım
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            this.importData();
        });

        // CSV dışa/içe aktarım ve sıfırlama
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }
        const importCsvBtn = document.getElementById('importCsvBtn');
        if (importCsvBtn) {
            importCsvBtn.addEventListener('click', () => this.importCSV());
        }
        const resetDataBtn = document.getElementById('resetDataBtn');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => this.resetData());
        }

        // Rapor yazdır
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printReport());
        }

        // Ayarlar
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettingsDialog());
        }

        // Hızlı yeni butonu smooth scroll ve focus
        const quickNewBtn = document.getElementById('quickNewBtn');
        if (quickNewBtn) {
            quickNewBtn.addEventListener('click', () => {
                const form = document.getElementById('transactionForm');
                if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const desc = document.getElementById('description');
                if (desc) desc.focus();
            });
        }

        // Mobil daha fazla menü
        const moreMenuBtn = document.getElementById('moreMenuBtn');
        const moreMenu = document.getElementById('moreMenu');
        if (moreMenuBtn && moreMenu) {
            moreMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                moreMenu.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!moreMenu.contains(e.target)) {
                    moreMenu.classList.add('hidden');
                }
            });
            const mm = (id, fn) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('click', () => { moreMenu.classList.add('hidden'); fn(); });
            };
            mm('mmExport', () => this.exportData());
            mm('mmImport', () => this.importData());
            mm('mmExportCsv', () => this.exportCSV());
            mm('mmImportCsv', () => this.importCSV());
            mm('mmPrint', () => this.printReport());
            mm('mmSettings', () => this.showSettingsDialog());
        }

        // Yetkilendirme butonları
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) loginBtn.addEventListener('click', () => this.showLoginDialog());
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) registerBtn.addEventListener('click', () => this.showRegisterDialog());
        const loginGateBtn = document.getElementById('loginGateBtn');
        if (loginGateBtn) loginGateBtn.addEventListener('click', () => this.showLoginDialog());
        const registerGateBtn = document.getElementById('registerGateBtn');
        if (registerGateBtn) registerGateBtn.addEventListener('click', () => this.showRegisterDialog());
        const accountBtn = document.getElementById('accountBtn');
        if (accountBtn) {
            accountBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('accountMenu');
                if (menu) menu.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                const menu = document.getElementById('accountMenu');
                if (menu) menu.classList.add('hidden');
            });
        }
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logoutUser());
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) profileBtn.addEventListener('click', () => this.showProfileDialog());
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) changePasswordBtn.addEventListener('click', () => this.showChangePasswordDialog());
        const verifyEmailBtn = document.getElementById('verifyEmailBtn');
        if (verifyEmailBtn) verifyEmailBtn.addEventListener('click', () => this.showVerifyEmailDialog());

        // Global olay delegasyonu (özel bağlantılar başarısız olursa)
        document.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */(e.target);
            if (!target) return;
            const map = [
                { sel: '#loginGateBtn', fn: () => this.showLoginDialog() },
                { sel: '#registerGateBtn', fn: () => this.showRegisterDialog() },
                { sel: '#loginBtn', fn: () => this.showLoginDialog() },
                { sel: '#registerBtn', fn: () => this.showRegisterDialog() },
                { sel: '#toRegister', fn: () => this.showRegisterDialog() },
                { sel: '#toLogin', fn: () => this.showLoginDialog() },
                { sel: '#forgotPassword', fn: () => this.showResetPasswordDialog() },
            ];
            for (const { sel, fn } of map) {
                const btn = target.closest(sel);
                if (btn) {
                    e.preventDefault();
                    // Yeni modal açılmadan önce mevcut modalları kapat
                    const modals = document.querySelectorAll('.fixed.inset-0');
                    modals.forEach(m => { if (m.classList.contains('bg-black')) m.parentNode && m.parentNode.removeChild(m); });
                    fn();
                    break;
                }
            }
        });

        // Hedefler
        document.getElementById('addGoalBtn').addEventListener('click', () => {
            this.showGoalDialog();
        });

        // Tekrarlayan işlemler
        document.getElementById('recurringBtn').addEventListener('click', () => {
            this.showRecurringDialog();
        });

        // Hızlı tutar hesaplayıcı
        document.getElementById('quickAmountBtn').addEventListener('click', () => {
            this.showCalculator();
        });

        // Klavye kısayolları
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: Yeni işlem
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('description').focus();
            }

            // Ctrl/Cmd + D: Karanlık mod değiştir
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleDarkMode();
            }

            // Ctrl/Cmd + S: Verileri dışa aktar
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.exportData();
            }

            // Ctrl/Cmd + F: Arama odakla
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }

            // Escape: Açık modalları kapat
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.fixed.inset-0');
                modals.forEach(modal => {
                    if (modal.style.display !== 'none' && modal.classList.contains('bg-black')) {
                        document.body.removeChild(modal);
                    }
                });
            }
        });
    }

    // ============ AUTH (LocalStorage tabanlı) ============
    loadCurrentUser() {
        try {
            const id = localStorage.getItem('budgetCurrentUserId');
            if (!id) return null;
            const users = this.getUsers();
            return users.find(u => String(u.id) === String(id)) || null;
        } catch (_) {
            return null;
        }
    }

    saveCurrentUser(user) {
        if (user && user.id) {
            localStorage.setItem('budgetCurrentUserId', String(user.id));
            this.currentUser = user;
        } else {
            localStorage.removeItem('budgetCurrentUserId');
            this.currentUser = null;
        }
        // Kullanıcıya özel verileri yeniden yükle
        this.loadFromLocalStorage();
        this.updateUI();
        this.refreshAuthUI();
    }

    refreshAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const accountDropdown = document.getElementById('accountDropdown');
        const accountName = document.getElementById('accountName');
        const accountEmail = document.getElementById('accountEmail');
        const gate = document.getElementById('authGate');
        if (this.currentUser) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (accountDropdown) accountDropdown.classList.remove('hidden');
            if (accountName) accountName.textContent = this.currentUser.name || '-';
            if (accountEmail) accountEmail.textContent = this.currentUser.email || '-';
            if (gate) gate.classList.add('hidden');
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            if (accountDropdown) accountDropdown.classList.add('hidden');
            if (gate) gate.classList.remove('hidden');
        }
    }

    showLoginDialog() {
        const gate = document.getElementById('authGate');
        if (gate) gate.classList.add('hidden');
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <!-- Header -->
                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center">
                    <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-sign-in-alt text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white">Hoş Geldiniz</h3>
                    <p class="text-white/80 text-sm mt-1">Hesabınıza giriş yapın</p>
                </div>
                <!-- Form -->
                <div class="p-6 space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">E-posta</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <i class="fas fa-envelope"></i>
                            </span>
                            <input type="email" id="loginEmail" 
                                class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 transition-all" 
                                placeholder="ornek@mail.com">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Şifre</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <i class="fas fa-lock"></i>
                            </span>
                            <input type="password" id="loginPassword" 
                                class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 transition-all" 
                                placeholder="••••••••">
                            <button type="button" id="toggleLoginPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between">
                        <button id="forgotPassword" class="text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
                            <i class="fas fa-question-circle mr-1"></i>Şifremi Unuttum
                        </button>
                    </div>
                    <button id="doLogin" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        <i class="fas fa-sign-in-alt"></i>
                        <span>Giriş Yap</span>
                    </button>
                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-white dark:bg-gray-800 text-gray-500">veya</span>
                        </div>
                    </div>
                    <div class="text-center">
                        <span class="text-sm text-gray-600 dark:text-gray-300">Hesabınız yok mu?</span>
                        <button id="toRegister" class="text-sm text-indigo-600 hover:text-indigo-700 font-semibold ml-1 hover:underline transition-colors">
                            Kayıt Ol
                        </button>
                    </div>
                    <button id="cancelLogin" class="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                        İptal
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.zIndex = '2000';

        // Şifre göster/gizle
        const toggleBtn = document.getElementById('toggleLoginPassword');
        const passwordInput = document.getElementById('loginPassword');
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }

        const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
        document.getElementById('cancelLogin').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        document.getElementById('doLogin').addEventListener('click', async () => {
            const loginBtn = document.getElementById('doLogin');
            const email = /** @type {HTMLInputElement} */(document.getElementById('loginEmail')).value.trim().toLowerCase();
            const password = /** @type {HTMLInputElement} */(document.getElementById('loginPassword')).value;

            if (!this.validateEmail(email) || !password) {
                this.showNotification('Geçerli e-posta ve şifre girin', 'error');
                return;
            }

            // Yükleme durumu
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Giriş yapılıyor...</span>';

            const users = this.getUsers();
            const user = users.find(u => u.email === email);

            if (!user) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Giriş Yap</span>';
                this.showNotification('Bu e-posta ile kayıtlı kullanıcı bulunamadı', 'error');
                return;
            }

            const hash = await this.hashPassword(password);
            if (user.passHash !== hash) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Giriş Yap</span>';
                this.showNotification('Şifre hatalı! Lütfen tekrar deneyin', 'error');
                return;
            }

            this.saveCurrentUser(user);
            this.showNotification('Hoş geldin, ' + (user.name || 'Kullanıcı') + '! 🎉', 'success');
            close();
        });

        document.getElementById('forgotPassword').addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            close();
            this.showResetPasswordDialog();
        });

        const toRegister = document.getElementById('toRegister');
        if (toRegister) {
            toRegister.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                close();
                this.showRegisterDialog();
            });
        }

        // Modal giriş yapılmadan kapatılırsa, kapıyı tekrar göster
        modal.addEventListener('click', (e) => {
            if (e.target === modal && !this.currentUser) {
                if (gate) gate.classList.remove('hidden');
            }
        });
        document.getElementById('cancelLogin').addEventListener('click', () => {
            if (!this.currentUser && gate) gate.classList.remove('hidden');
        });
    }

    showRegisterDialog() {
        const gate = document.getElementById('authGate');
        if (gate) gate.classList.add('hidden');
        
        // Mevcut modal varsa temizle
        const existingModal = document.querySelector('.fixed.inset-0');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center fade-in';
        modal.style.zIndex = '2000';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <!-- Header -->
                <div class="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-center">
                    <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-user-plus text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white">Hesap Oluştur</h3>
                    <p class="text-white/80 text-sm mt-1">Hemen ücretsiz kaydolun</p>
                </div>
                <!-- Form -->
                <div class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ad Soyad</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <i class="fas fa-user"></i>
                            </span>
                            <input type="text" id="regName" 
                                class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 transition-all" 
                                placeholder="Adınız Soyadınız">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">E-posta</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <i class="fas fa-envelope"></i>
                            </span>
                            <input type="email" id="regEmail" 
                                class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 transition-all" 
                                placeholder="ornek@mail.com">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Şifre</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <i class="fas fa-lock"></i>
                            </span>
                            <input type="password" id="regPassword" 
                                class="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 transition-all" 
                                placeholder="En az 6 karakter">
                            <button type="button" id="toggleRegPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1"><i class="fas fa-info-circle mr-1"></i>Şifreniz en az 6 karakter olmalıdır</p>
                    </div>
                    <button id="doRegister" class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        <i class="fas fa-user-plus"></i>
                        <span>Kayıt Ol</span>
                    </button>
                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-white dark:bg-gray-800 text-gray-500">veya</span>
                        </div>
                    </div>
                    <div class="text-center">
                        <span class="text-sm text-gray-600 dark:text-gray-300">Zaten hesabınız var mı?</span>
                        <button id="toLogin" class="text-sm text-emerald-600 hover:text-emerald-700 font-semibold ml-1 hover:underline transition-colors">
                            Giriş Yap
                        </button>
                    </div>
                    <button id="cancelRegister" class="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                        İptal
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listener'ları modal eklendikten sonra bağla
        setTimeout(() => {
            // Şifre göster/gizle
            const toggleBtn = document.getElementById('toggleRegPassword');
            const passwordInput = document.getElementById('regPassword');
            if (toggleBtn && passwordInput) {
                toggleBtn.addEventListener('click', () => {
                    const type = passwordInput.type === 'password' ? 'text' : 'password';
                    passwordInput.type = type;
                    toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
                });
            }

            const close = () => { 
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            };
            
            const cancelBtn = document.getElementById('cancelRegister');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', close);
            }
            
            modal.addEventListener('click', (e) => { 
                if (e.target === modal) close(); 
            });

            const registerBtn = document.getElementById('doRegister');
            if (registerBtn) {
                registerBtn.addEventListener('click', async () => {
                    const name = document.getElementById('regName').value.trim();
                    const email = document.getElementById('regEmail').value.trim().toLowerCase();
                    const password = document.getElementById('regPassword').value;

                    console.log('Kayıt denemesi:', { name, email, password: password.length });

                    if (!name) {
                        this.showNotification('Lütfen adınızı ve soyadınızı girin', 'error');
                        return;
                    }
                    if (!this.validateEmail(email)) {
                        this.showNotification('Lütfen geçerli bir e-posta adresi girin', 'error');
                        return;
                    }
                    if ((password || '').length < 6) {
                        this.showNotification('Şifreniz en az 6 karakter olmalıdır', 'error');
                        return;
                    }

                    // Yükleme durumu
                    registerBtn.disabled = true;
                    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Kayıt yapılıyor...</span>';

                    const users = this.getUsers();
                    if (users.some(u => u.email === email)) {
                        registerBtn.disabled = false;
                        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Kayıt Ol</span>';
                        this.showNotification('Bu e-posta adresi zaten kullanılıyor', 'warning');
                        return;
                    }

                    const passHash = await this.hashPassword(password);
                    const user = { id: Date.now(), name, email, passHash, createdAt: new Date().toISOString() };
                    users.push(user);
                    this.saveUsers(users);
                    this.saveCurrentUser(user);
                    this.showNotification('Kayıt başarılı! Hoş geldin, ' + name + '! 🎉', 'success');
                    close();
                });
            }

            const toLoginBtn = document.getElementById('toLogin');
            if (toLoginBtn) {
                toLoginBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    close();
                    this.showLoginDialog();
                });
            }

            // Modal giriş yapılmadan kapatılırsa, kapıyı tekrar göster
            modal.addEventListener('click', (e) => {
                if (e.target === modal && !this.currentUser) {
                    if (gate) gate.classList.remove('hidden');
                }
            });
            
            const cancelRegisterBtn = document.getElementById('cancelRegister');
            if (cancelRegisterBtn) {
                cancelRegisterBtn.addEventListener('click', () => {
                    if (!this.currentUser && gate) gate.classList.remove('hidden');
                });
            }
        }, 100);
    }

    logoutUser() {
        const menu = document.getElementById('accountMenu');
        if (menu) menu.classList.add('hidden');
        this.saveCurrentUser(null);
        this.showNotification('Çıkış yapıldı', 'info');
    }

    showProfileDialog() {
        if (!this.currentUser) return this.showLoginDialog();
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        const u = this.currentUser;
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Profil</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ad Soyad</label>
                        <input type="text" id="profileName" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200" value="${u.name || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">E-posta</label>
                        <input type="email" id="profileEmail" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200" value="${u.email || ''}">
                        <p class="text-xs mt-1 ${u.emailVerified ? 'text-green-600' : 'text-yellow-600'}">${u.emailVerified ? 'Doğrulandı' : 'Doğrulanmamış'}</p>
                    </div>
                    <div class="flex space-x-3">
                        <button id="saveProfileBtn" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">Kaydet</button>
                        <button id="cancelProfileBtn" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">İptal</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
        document.getElementById('cancelProfileBtn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('saveProfileBtn').addEventListener('click', () => {
            const name = /** @type {HTMLInputElement} */(document.getElementById('profileName')).value.trim();
            const email = /** @type {HTMLInputElement} */(document.getElementById('profileEmail')).value.trim().toLowerCase();
            if (!name || !this.validateEmail(email)) { this.showNotification('Geçerli ad ve e-posta girin', 'error'); return; }
            const users = this.getUsers();
            // Unique email check if changed
            if (email !== u.email && users.some(x => x.email === email)) { this.showNotification('Bu e-posta zaten kullanımda', 'warning'); return; }
            u.name = name;
            if (email !== u.email) { u.email = email; u.emailVerified = false; }
            this.replaceUser(u);
            this.saveCurrentUser(u);
            this.showNotification('Profil güncellendi', 'success');
            close();
        });
    }

    showChangePasswordDialog() {
        if (!this.currentUser) return this.showLoginDialog();
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Parola Değiştir</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mevcut Parola</label>
                        <input type="password" id="oldPass" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yeni Parola</label>
                        <input type="password" id="newPass" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200" placeholder="En az 6 karakter">
                    </div>
                    <div class="flex space-x-3">
                        <button id="savePassBtn" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">Kaydet</button>
                        <button id="cancelPassBtn" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">İptal</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
        document.getElementById('cancelPassBtn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('savePassBtn').addEventListener('click', async () => {
            const oldPass = /** @type {HTMLInputElement} */(document.getElementById('oldPass')).value;
            const newPass = /** @type {HTMLInputElement} */(document.getElementById('newPass')).value;
            if ((newPass || '').length < 6) { this.showNotification('Yeni parola en az 6 karakter olmalı', 'error'); return; }
            const hashOld = await this.hashPassword(oldPass || '');
            if (hashOld !== this.currentUser.passHash) { this.showNotification('Mevcut parola hatalı', 'error'); return; }
            this.currentUser.passHash = await this.hashPassword(newPass);
            this.replaceUser(this.currentUser);
            this.saveCurrentUser(this.currentUser);
            this.showNotification('Parola güncellendi', 'success');
            close();
        });
    }

    showVerifyEmailDialog() {
        if (!this.currentUser) return this.showLoginDialog();
        if (this.currentUser.emailVerified) { this.showNotification('E-posta zaten doğrulandı', 'info'); return; }
        const code = this.generateCode();
        this.currentUser.verifyCode = code;
        this.currentUser.verifyCodeAt = Date.now();
        this.replaceUser(this.currentUser);
        this.saveCurrentUser(this.currentUser);
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">E‑posta Doğrulama</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Demo amaçlı doğrulama kodu aşağıda gösterilmiştir. E-posta entegrasyonu eklendiğinde bu kod e‑posta ile gönderilecektir.</p>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3 text-center font-mono text-lg">${code}</div>
                <input id="verifyInput" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200" placeholder="Kodu girin">
                <div class="flex space-x-3 mt-4">
                    <button id="verifyBtn" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">Doğrula</button>
                    <button id="cancelVerifyBtn" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">İptal</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
        document.getElementById('cancelVerifyBtn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('verifyBtn').addEventListener('click', () => {
            const val = /** @type {HTMLInputElement} */(document.getElementById('verifyInput')).value.trim();
            if (val === String(this.currentUser.verifyCode)) {
                this.currentUser.emailVerified = true;
                delete this.currentUser.verifyCode;
                delete this.currentUser.verifyCodeAt;
                this.replaceUser(this.currentUser);
                this.saveCurrentUser(this.currentUser);
                this.refreshAuthUI();
                this.showNotification('E‑posta doğrulandı', 'success');
                close();
            } else {
                this.showNotification('Kod geçersiz', 'error');
            }
        });
    }

    showResetPasswordDialog() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">Parola Sıfırla</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">E‑posta adresinizi girin. Demo amaçlı doğrulama kodu ekranda gösterilecektir.</p>
                <div class="space-y-4">
                    <input id="resetEmail" type="email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200" placeholder="ornek@mail.com">
                    <div id="resetSection" class="hidden space-y-3">
                        <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center font-mono text-lg" id="resetCodeView">-</div>
                        <input id="resetCodeInput" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200" placeholder="Kodu girin">
                        <input id="resetNewPass" type="password" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200" placeholder="Yeni parola (min 6)">
                    </div>
                    <div class="flex space-x-3">
                        <button id="sendResetBtn" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">Kod Al</button>
                        <button id="applyResetBtn" class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors" disabled>Parolayı Sıfırla</button>
                        <button id="cancelResetBtn" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
        document.getElementById('cancelResetBtn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('sendResetBtn').addEventListener('click', () => {
            const email = /** @type {HTMLInputElement} */(document.getElementById('resetEmail')).value.trim().toLowerCase();
            const users = this.getUsers();
            const user = users.find(u => u.email === email);
            if (!this.validateEmail(email) || !user) { this.showNotification('Geçerli bir e-posta girin', 'error'); return; }
            user.resetCode = this.generateCode();
            user.resetCodeAt = Date.now();
            this.replaceUser(user);
            document.getElementById('resetCodeView').textContent = user.resetCode;
            document.getElementById('resetSection').classList.remove('hidden');
            document.getElementById('applyResetBtn').removeAttribute('disabled');
            this.showNotification('Demo: Kod ekranda gösterildi', 'info');
        });
        document.getElementById('applyResetBtn').addEventListener('click', async () => {
            const email = /** @type {HTMLInputElement} */(document.getElementById('resetEmail')).value.trim().toLowerCase();
            const code = /** @type {HTMLInputElement} */(document.getElementById('resetCodeInput')).value.trim();
            const newPass = /** @type {HTMLInputElement} */(document.getElementById('resetNewPass')).value;
            if ((newPass || '').length < 6) { this.showNotification('Yeni parola en az 6 karakter olmalı', 'error'); return; }
            const users = this.getUsers();
            const user = users.find(u => u.email === email);
            if (!user || String(user.resetCode) !== code) { this.showNotification('Kod geçersiz', 'error'); return; }
            user.passHash = await this.hashPassword(newPass);
            delete user.resetCode; delete user.resetCodeAt;
            this.replaceUser(user);
            // Eğer bu kullanıcı aktifse güncelle
            if (this.currentUser && this.currentUser.id === user.id) this.saveCurrentUser(user);
            this.showNotification('Parola sıfırlandı', 'success');
            close();
        });
    }

    replaceUser(user) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) users[idx] = user; else users.push(user);
        this.saveUsers(users);
    }

    generateCode() { return Math.floor(100000 + Math.random() * 900000); }

    getUsers() {
        try {
            const raw = localStorage.getItem('budgetUsers');
            return raw ? JSON.parse(raw) : [];
        } catch (_) { return []; }
    }

    saveUsers(users) {
        localStorage.setItem('budgetUsers', JSON.stringify(users));
    }

    validateEmail(email) {
        return /\S+@\S+\.\S+/.test(email);
    }

    async hashPassword(password) {
        try {
            if (window.crypto && window.crypto.subtle) {
                const enc = new TextEncoder();
                const data = enc.encode(password);
                const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
                return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (_) { /* ignore */ }
        // Fallback (daha zayıf) – sadece demo amaçlı
        let h = 0;
        for (let i = 0; i < password.length; i++) {
            h = (h << 5) - h + password.charCodeAt(i);
            h |= 0;
        }
        return ('00000000' + (h >>> 0).toString(16)).slice(-8);
    }

    animateOnLoad() {
        // Stagger animation for cards
        const cards = document.querySelectorAll('.fade-in');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    setTransactionType(type) {
        this.transactionType = type;

        const incomeBtn = document.getElementById('incomeBtn');
        const expenseBtn = document.getElementById('expenseBtn');

        if (type === 'income') {
            incomeBtn.classList.add('bg-green-500', 'text-white', 'border-green-500', 'shadow-lg');
            incomeBtn.classList.remove('border-gray-300', 'text-gray-700');
            expenseBtn.classList.remove('bg-red-500', 'text-white', 'border-red-500', 'shadow-lg');
            expenseBtn.classList.add('border-gray-300', 'text-gray-700');
        } else {
            expenseBtn.classList.add('bg-red-500', 'text-white', 'border-red-500', 'shadow-lg');
            expenseBtn.classList.remove('border-gray-300', 'text-gray-700');
            incomeBtn.classList.remove('bg-green-500', 'text-white', 'border-green-500', 'shadow-lg');
            incomeBtn.classList.add('border-gray-300', 'text-gray-700');
        }

        this.updateCategoryOptions();
    }

    updateCategoryOptions() {
        const categorySelect = document.getElementById('category');
        const categories = this.categories[this.transactionType];

        categorySelect.innerHTML = '<option value="">Kategori Seçin</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    setFilter(filter) {
        this.currentFilter = filter;

        const filterButtons = {
            all: document.getElementById('filterAll'),
            income: document.getElementById('filterIncome'),
            expense: document.getElementById('filterExpense')
        };

        Object.keys(filterButtons).forEach(key => {
            if (key === filter) {
                filterButtons[key].classList.add('bg-white', 'text-gray-800', 'shadow-sm');
                filterButtons[key].classList.remove('text-gray-600');
            } else {
                filterButtons[key].classList.remove('bg-white', 'text-gray-800', 'shadow-sm');
                filterButtons[key].classList.add('text-gray-600');
            }
        });

        this.renderTransactions();
    }

    setSortBy(sortBy) {
        if (this.sortBy === sortBy) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = sortBy;
            this.sortOrder = 'desc';
        }

        this.renderTransactions();
    }

    addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const tags = document.getElementById('tags').value.trim();

        if (!description || !amount || !category || !date) {
            this.showNotification('Lütfen tüm zorunlu alanları doldurun', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            type: this.transactionType,
            description,
            amount,
            category,
            date,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            timestamp: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveToLocalStorage();
        this.updateUI();
        this.resetForm();
        this.showNotification('İşlem başarıyla eklendi', 'success');
        this.checkBudgetAlerts(transaction);
    }

    deleteTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;
        const needConfirm = this.settings ? this.settings.confirmDelete !== false : true;
        if (needConfirm) {
            if (!confirm(`"${transaction.description}" işlemini silmek istediğinizden emin misiniz?`)) return;
        }
        // Remove and allow undo
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToLocalStorage();
        this.updateUI();
        this._lastDeleted = transaction;
        if (this._undoTimer) {
            clearTimeout(this._undoTimer);
            this._undoTimer = null;
        }
        this.showUndoSnackbar(`İşlem silindi`);
        // Permanently clear undo after 5s
        this._undoTimer = setTimeout(() => {
            this._lastDeleted = null;
            this._undoTimer = null;
        }, 5000);
    }

    editTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (transaction) {
            this.setTransactionType(transaction.type);
            document.getElementById('description').value = transaction.description;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('category').value = transaction.category;
            document.getElementById('date').value = transaction.date;
            document.getElementById('tags').value = transaction.tags.join(', ');

            this.deleteTransaction(id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    resetForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();
    }

    calculateBalance() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const expense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        return { income, expense, balance: income - expense };
    }

    calculateMonthlyStats() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyTransactions = this.transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        });

        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const monthlyExpense = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        return { monthlyIncome, monthlyExpense };
    }

    updateBalanceDisplay() {
        const { income, expense, balance } = this.calculateBalance();
        const { monthlyIncome, monthlyExpense } = this.calculateMonthlyStats();

        document.getElementById('totalIncome').textContent = `₺${income.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        document.getElementById('totalExpense').textContent = `₺${expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        const balanceElement = document.getElementById('netBalance');
        balanceElement.textContent = `₺${balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        balanceElement.classList.remove('text-green-600', 'text-red-600', 'text-indigo-600', 'balance-positive', 'balance-negative');
        if (balance > 0) {
            balanceElement.classList.add('balance-positive');
        } else if (balance < 0) {
            balanceElement.classList.add('balance-negative');
        } else {
            balanceElement.classList.add('text-indigo-600');
        }

        // Update trend
        const lastMonthBalance = this.calculateLastMonthBalance();
        const trend = lastMonthBalance !== 0 ? ((balance - lastMonthBalance) / Math.abs(lastMonthBalance) * 100) : 0;
        const trendElement = document.getElementById('balanceTrend');
        trendElement.textContent = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;
        trendElement.className = trend >= 0 ? 'text-green-600' : 'text-red-600';

        // Update header balance chip
        const chip = document.getElementById('headerBalanceChip');
        const chipText = document.getElementById('headerNetBalance');
        const chipIcon = document.getElementById('headerBalanceIcon');
        if (chip && chipText && chipIcon) {
            chip.classList.remove('hidden');
            chipText.textContent = `₺${balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
            chipIcon.classList.remove('fa-arrow-trend-up', 'fa-arrow-trend-down', 'fa-balance-scale');
            if (balance > 0) {
                chipIcon.classList.add('fa-arrow-trend-up');
                chip.style.borderColor = '#86efac';
                chip.style.color = this.isDarkMode ? '#86efac' : '#15803d';
            } else if (balance < 0) {
                chipIcon.classList.add('fa-arrow-trend-down');
                chip.style.borderColor = '#fca5a5';
                chip.style.color = this.isDarkMode ? '#fca5a5' : '#b91c1c';
            } else {
                chipIcon.classList.add('fa-balance-scale');
                chip.style.borderColor = '#d1d5db';
                chip.style.color = this.isDarkMode ? '#e5e7eb' : '#374151';
            }
        }

        // Update budget progress
        this.updateBudgetProgress(monthlyIncome, monthlyExpense);
    }

    calculateLastMonthBalance() {
        const now = new Date();
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        const lastMonthTransactions = this.transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === lastMonth && tDate.getFullYear() === lastYear;
        });

        const income = lastMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const expense = lastMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        return income - expense;
    }

    updateBudgetProgress(monthlyIncome, monthlyExpense) {
        const monthlyBudget = monthlyIncome * 0.8; // 80% of income as budget
        const budgetUsed = monthlyBudget > 0 ? (monthlyExpense / monthlyBudget) * 100 : 0;

        const progressCircle = document.getElementById('budgetProgress');
        const budgetPercent = document.getElementById('budgetPercent');
        const budgetStatus = document.getElementById('budgetStatus');
        const budgetIcon = document.getElementById('budgetIcon');

        if (!progressCircle || !budgetPercent || !budgetStatus || !budgetIcon) return;

        const circumference = 2 * Math.PI * 24;
        const offset = circumference - (budgetUsed / 100) * circumference;

        progressCircle.style.strokeDashoffset = offset;
        budgetPercent.textContent = `${Math.min(100, Math.round(budgetUsed))}%`;

        if (budgetUsed < 50) {
            budgetStatus.textContent = 'İyi';
            budgetStatus.className = 'text-xl font-bold text-green-600';
            progressCircle.style.stroke = '#10b981';
            budgetIcon.className = 'fas fa-piggy-bank text-sm text-green-600';
        } else if (budgetUsed < 80) {
            budgetStatus.textContent = 'Orta';
            budgetStatus.className = 'text-xl font-bold text-yellow-600';
            progressCircle.style.stroke = '#eab308';
            budgetIcon.className = 'fas fa-piggy-bank text-sm text-yellow-600';
        } else {
            budgetStatus.textContent = 'Dikkat';
            budgetStatus.className = 'text-xl font-bold text-red-600';
            progressCircle.style.stroke = '#ef4444';
            budgetIcon.className = 'fas fa-exclamation-triangle text-sm text-red-600';
        }
    }

    getFilteredAndSortedTransactions() {
        let filtered = this.transactions;

        // Apply filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(t => t.type === this.currentFilter);
        }

        // Apply search
        if (this.searchTerm) {
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(this.searchTerm) ||
                t.category.toLowerCase().includes(this.searchTerm) ||
                t.tags.some(tag => tag.toLowerCase().includes(this.searchTerm))
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal, bVal;

            if (this.sortBy === 'date') {
                aVal = new Date(a.date);
                bVal = new Date(b.date);
            } else if (this.sortBy === 'amount') {
                aVal = a.amount;
                bVal = b.amount;
            }

            if (this.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        const emptyState = document.getElementById('emptyState');
        const countElement = document.getElementById('transactionCount');

        const filteredTransactions = this.getFilteredAndSortedTransactions();

        countElement.textContent = filteredTransactions.length;

        if (filteredTransactions.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';

        container.innerHTML = filteredTransactions.map(transaction => {
            const isIncome = transaction.type === 'income';
            const categoryInfo = this.categories[transaction.type].find(c => c.name === transaction.category);
            const icon = categoryInfo?.icon || (isIncome ? 'fa-arrow-up' : 'fa-arrow-down');
            const color = categoryInfo?.color || (isIncome ? '#10b981' : '#ef4444');
            const bgColorClass = isIncome ? 'bg-green-50' : 'bg-red-50';
            const sign = isIncome ? '+' : '-';

            return `
                <div class="transaction-item bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md border-l-4 slide-up" 
                     style="border-color: ${color}; animation-delay: ${Math.random() * 0.1}s">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="${bgColorClass} p-2.5 rounded-xl">
                                <i class="fas ${icon} text-base" style="color: ${color}" data-keep-color></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 dark:text-gray-200">${transaction.description}</h3>
                                <div class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    <span class="category-badge px-2 py-1 rounded-full text-xs font-medium" 
                                          style="background-color: ${color}20; color: ${color}" data-keep-color>
                                        ${transaction.category}
                                    </span>
                                    <span>•</span>
                                    <span>${this.formatDate(transaction.date)}</span>
                                    ${transaction.tags.length > 0 ? `
                                        <span>•</span>
                                        <div class="flex gap-1">
                                            ${transaction.tags.map(tag => `
                                                <span class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">#${tag}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="font-bold text-lg" style="color: ${color}" data-keep-color>
                                ${sign}₺${transaction.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </span>
                            <div class="flex space-x-1">
                                <button onclick="budgetTracker.editTransaction(${transaction.id})" 
                                    class="text-gray-400 hover:text-blue-500 transition-colors p-1.5">
                                    <i class="fas fa-edit text-sm"></i>
                                </button>
                                <button onclick="budgetTracker.deleteTransaction(${transaction.id})" 
                                    class="text-gray-400 hover:text-red-500 transition-colors p-1.5">
                                    <i class="fas fa-trash text-sm"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatDate(dateString) {
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('tr-TR', options);
    }

    initCharts() {
        // Category Chart
        const categoryCtx = document.getElementById('categoryChart');
        if (categoryCtx) {
            this.categoryChart = new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [],
                        borderColor: '#ffffff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#374151',
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.label}: ₺${context.parsed.toLocaleString('tr-TR')}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Trend Chart
        const trendCtx = document.getElementById('trendChart');
        if (trendCtx) {
            this.trendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Gelir',
                            data: [],
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Gider',
                            data: [],
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#374151',
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ₺${context.parsed.y.toLocaleString('tr-TR')}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                color: '#6b7280'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                color: '#6b7280',
                                callback: (value) => `₺${value.toLocaleString('tr-TR')}`
                            }
                        }
                    }
                }
            });
        }
    }

    updateChart() {
        if (!this.categoryChart) return;

        const expenseTransactions = this.getTransactionsByPeriod(this.chartPeriod);
        const categoryTotals = {};

        expenseTransactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                if (!categoryTotals[transaction.category]) {
                    categoryTotals[transaction.category] = 0;
                }
                categoryTotals[transaction.category] += (parseFloat(transaction.amount) || 0);
            }
        });

        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const labels = sortedCategories.map(([category]) => category);
        const data = sortedCategories.map(([, total]) => total);
        const colors = labels.map(label => {
            const category = this.categories.expense.find(c => c.name === label);
            return category?.color || '#6b7280';
        });

        this.categoryChart.data.labels = labels;
        this.categoryChart.data.datasets[0].data = data;
        this.categoryChart.data.datasets[0].backgroundColor = colors;

        // Update chart colors for dark mode
        if (this.isDarkMode) {
            this.categoryChart.options.plugins.legend.labels.color = '#e2e8f0';
            this.categoryChart.data.datasets[0].borderColor = '#1e293b';
        } else {
            this.categoryChart.options.plugins.legend.labels.color = '#374151';
            this.categoryChart.data.datasets[0].borderColor = '#ffffff';
        }

        this.categoryChart.update();

        // Update statistics
        this.updateCategoryStats(sortedCategories);
    }

    updateCategoryStats(sortedCategories) {
        const topCategoryEl = document.getElementById('topCategory');
        const avgExpenseEl = document.getElementById('avgExpense');

        if (sortedCategories.length > 0) {
            const [topCategory, topAmount] = sortedCategories[0];
            const avgExpense = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0) / sortedCategories.length;

            if (topCategoryEl) {
                topCategoryEl.textContent = topCategory || '-';
            }
            if (avgExpenseEl) {
                avgExpenseEl.textContent = `₺${avgExpense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
            }
        } else {
            if (topCategoryEl) topCategoryEl.textContent = '-';
            if (avgExpenseEl) avgExpenseEl.textContent = '₺0';
        }
    }

    getTransactionsByPeriod(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }

        return this.transactions.filter(t => new Date(t.date) >= startDate);
    }

    updateTrendChart() {
        if (!this.trendChart) return;

        const monthlyData = this.getMonthlyData();
        const labels = monthlyData.map(d => d.label);
        const incomeData = monthlyData.map(d => d.income);
        const expenseData = monthlyData.map(d => d.expense);

        this.trendChart.data.labels = labels;
        this.trendChart.data.datasets[0].data = incomeData;
        this.trendChart.data.datasets[1].data = expenseData;

        // Update chart colors for dark mode
        if (this.isDarkMode) {
            this.trendChart.options.plugins.legend.labels.color = '#e2e8f0';
            this.trendChart.options.scales.x.ticks.color = '#e2e8f0';
            this.trendChart.options.scales.y.ticks.color = '#e2e8f0';
            this.trendChart.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.1)';
            this.trendChart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
        } else {
            this.trendChart.options.plugins.legend.labels.color = '#374151';
            this.trendChart.options.scales.x.ticks.color = '#6b7280';
            this.trendChart.options.scales.y.ticks.color = '#6b7280';
            this.trendChart.options.scales.x.grid.color = 'rgba(0, 0, 0, 0.1)';
            this.trendChart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.1)';
        }

        this.trendChart.update();
    }

    getMonthlyData() {
        const now = new Date();
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });

            const monthTransactions = this.transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
            });

            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

            const expense = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

            data.push({ label: monthName, income, expense });
        }

        return data;
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark', this.isDarkMode);
        this.syncDarkToggleUI();
        localStorage.setItem('darkMode', this.isDarkMode.toString());
        if (this.categoryChart) {
            this.updateChart();
        }
        if (this.trendChart) {
            this.updateTrendChart();
        }
    }

    loadDarkMode() {
        const savedDarkMode = localStorage.getItem('darkMode');
        this.isDarkMode = savedDarkMode === 'true';
        document.body.classList.toggle('dark', this.isDarkMode);
        this.syncDarkToggleUI();
    }

    syncDarkToggleUI() {
        const btn = document.getElementById('darkModeToggle');
        const icon = btn ? btn.querySelector('i') : null;
        const tip = btn ? btn.querySelector('.tooltip-content') : null;
        if (!btn || !icon || !tip) return;
        if (this.isDarkMode) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            icon.classList.remove('text-gray-700');
            icon.classList.add('text-yellow-400');
            tip.textContent = 'Açık Mod';
            btn.setAttribute('aria-label', 'Açık Moda Geç');
            btn.setAttribute('title', 'Açık Mod');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            icon.classList.remove('text-yellow-400');
            icon.classList.add('text-gray-700');
            tip.textContent = 'Karanlık Mod';
            btn.setAttribute('aria-label', 'Karanlık Moda Geç');
            btn.setAttribute('title', 'Karanlık Mod');
        }
    }

    exportData() {
        const data = {
            transactions: this.transactions,
            goals: this.goals,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `butce-verileri-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Veriler başarıyla dışa aktarıldı', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.transactions = data.transactions || [];
                        this.goals = data.goals || [];
                        this.saveToLocalStorage();
                        this.updateUI();
                        this.showNotification('Veriler başarıyla içe aktarıldı', 'success');
                    } catch (error) {
                        this.showNotification('Dosya formatı hatalı', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }

    // New: Export transactions as CSV
    exportCSV() {
        if (!this.transactions.length) {
            this.showNotification('Dışa aktarılacak işlem bulunamadı', 'warning');
            return;
        }
        const headers = ['id', 'type', 'description', 'amount', 'category', 'date', 'tags'];
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };
        const rows = this.transactions.map(t => [
            t.id,
            t.type,
            t.description,
            (parseFloat(t.amount) || 0).toFixed(2),
            t.category,
            t.date,
            (t.tags || []).join('|')
        ].map(escapeCSV).join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `butce-islemler-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('CSV olarak dışa aktarıldı', 'success');
    }

    // New: Import transactions from CSV
    importCSV() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const text = ev.target.result;
                    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
                    if (lines.length < 2) throw new Error('CSV boş');
                    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const idx = (name) => header.findIndex(h => h.toLowerCase() === name);
                    const idIdx = idx('id');
                    const typeIdx = idx('type');
                    const descIdx = idx('description');
                    const amountIdx = idx('amount');
                    const categoryIdx = idx('category');
                    const dateIdx = idx('date');
                    const tagsIdx = idx('tags');

                    const parseCell = (cell) => cell.replace(/^\s*"|"\s*$/g, '').replace(/""/g, '"');

                    let added = 0;
                    for (let i = 1; i < lines.length; i++) {
                        const raw = lines[i];
                        if (!raw.trim()) continue;
                        // Simple CSV split respecting quotes
                        const cells = [];
                        let cur = '';
                        let inQuotes = false;
                        for (let ch of raw) {
                            if (ch === '"') { inQuotes = !inQuotes; cur += ch; }
                            else if (ch === ',' && !inQuotes) { cells.push(cur); cur = ''; }
                            else { cur += ch; }
                        }
                        cells.push(cur);

                        const type = parseCell(cells[typeIdx] || '').toLowerCase();
                        const description = parseCell(cells[descIdx] || '');
                        const amount = parseFloat(parseCell(cells[amountIdx] || '0')) || 0;
                        const category = parseCell(cells[categoryIdx] || 'Diğer Gider');
                        const date = parseCell(cells[dateIdx] || new Date().toISOString().split('T')[0]);
                        const tagsStr = parseCell(cells[tagsIdx] || '');
                        const tags = tagsStr ? tagsStr.split('|').map(t => t.trim()).filter(Boolean) : [];

                        if (!description || !category) continue;
                        const t = {
                            id: Date.now() + i,
                            type: type === 'income' ? 'income' : 'expense',
                            description,
                            amount,
                            category,
                            date,
                            tags,
                            timestamp: new Date().toISOString()
                        };
                        this.transactions.push(t);
                        added++;
                    }
                    if (added > 0) {
                        this.saveToLocalStorage();
                        this.updateUI();
                        this.showNotification(`${added} işlem CSV'den içe aktarıldı`, 'success');
                    } else {
                        this.showNotification('CSV içeriği uygun işlem bulundurmadı', 'warning');
                    }
                } catch (err) {
                    this.showNotification('CSV okunurken hata oluştu', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // New: Reset all data (transactions, goals)
    resetData() {
        if (!confirm('Tüm verileri sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
        this.transactions = [];
        this.goals = [];
        this.saveToLocalStorage();
        this.updateUI();
        this.showNotification('Tüm veriler sıfırlandı', 'info');
    }

    showGoalDialog() {
        // Create a proper modal instead of prompt
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Bütçe Hedefi Ekle</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
                        <select id="goalCategory" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                            <option value="">Kategori Seçin</option>
                            ${this.categories.expense.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hedef Tutar (₺)</label>
                        <input type="number" id="goalAmount" placeholder="0.00" step="0.01" min="0"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                    </div>
                    <div class="flex space-x-3">
                        <button id="saveGoal" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                            Kaydet
                        </button>
                        <button id="cancelGoal" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
                            İptal
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('saveGoal').addEventListener('click', () => {
            const category = document.getElementById('goalCategory').value;
            const amount = parseFloat(document.getElementById('goalAmount').value);

            if (category && amount > 0) {
                // Remove existing goal for this category if exists
                this.goals = this.goals.filter(g => g.category !== category);

                this.goals.push({
                    id: Date.now(),
                    category,
                    amount,
                    createdAt: new Date().toISOString()
                });

                this.saveToLocalStorage();
                this.updateGoals();
                this.showNotification('Bütçe hedefi eklendi', 'success');
                document.body.removeChild(modal);
            } else {
                this.showNotification('Lütfen tüm alanları doldurun', 'error');
            }
        });

        document.getElementById('cancelGoal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showRecurringDialog() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Tekrarlayan İşlem</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">İşlem Tipi</label>
                        <select id="recurringType" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                            <option value="expense">Gider</option>
                            <option value="income">Gelir</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Açıklama</label>
                        <input type="text" id="recurringDescription" placeholder="Örn: Aylık maaş"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tutar (₺)</label>
                        <input type="number" id="recurringAmount" placeholder="0.00" step="0.01" min="0"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tekrarlama Sıklığı</label>
                        <select id="recurringFrequency" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                            <option value="monthly">Aylık</option>
                            <option value="weekly">Haftalık</option>
                            <option value="yearly">Yıllık</option>
                        </select>
                    </div>
                    <div class="flex space-x-3">
                        <button id="saveRecurring" class="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                            Oluştur
                        </button>
                        <button id="cancelRecurring" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
                            İptal
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('saveRecurring').addEventListener('click', () => {
            const type = document.getElementById('recurringType').value;
            const description = document.getElementById('recurringDescription').value.trim();
            const amount = parseFloat(document.getElementById('recurringAmount').value);
            const frequency = document.getElementById('recurringFrequency').value;

            if (description && amount > 0) {
                // Create multiple transactions based on frequency
                const today = new Date();
                for (let i = 0; i < 12; i++) { // Create for next 12 periods
                    let date = new Date(today);

                    switch (frequency) {
                        case 'monthly':
                            date.setMonth(date.getMonth() + i);
                            break;
                        case 'weekly':
                            date.setDate(date.getDate() + (i * 7));
                            break;
                        case 'yearly':
                            date.setFullYear(date.getFullYear() + i);
                            break;
                    }

                    const transaction = {
                        id: Date.now() + i,
                        type,
                        description: `${description} (${frequency === 'monthly' ? 'Aylık' : frequency === 'weekly' ? 'Haftalık' : 'Yıllık'})`,
                        amount,
                        category: type === 'income' ? 'Maaş' : 'Diğer Gider',
                        date: date.toISOString().split('T')[0],
                        tags: ['tekrarlayan'],
                        timestamp: new Date().toISOString()
                    };

                    this.transactions.push(transaction);
                }

                this.saveToLocalStorage();
                this.updateUI();
                this.showNotification('Tekrarlayan işlemler oluşturuldu', 'success');
                document.body.removeChild(modal);
            } else {
                this.showNotification('Lütfen tüm alanları doldurun', 'error');
            }
        });

        document.getElementById('cancelRecurring').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showCalculator() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-80 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Hızlı Hesaplayıcı</h3>
                <div class="space-y-4">
                    <input type="text" id="calcDisplay" readonly 
                        class="w-full px-4 py-3 text-2xl text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                        value="0">
                    <div class="grid grid-cols-4 gap-2">
                        <button class="calc-btn col-span-2 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600" data-action="clear">C</button>
                        <button class="calc-btn bg-gray-300 dark:bg-gray-600 py-3 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500" data-action="backspace">←</button>
                        <button class="calc-btn bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600" data-action="divide">÷</button>
                        
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="7">7</button>
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="8">8</button>
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="9">9</button>
                        <button class="calc-btn bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600" data-action="multiply">×</button>
                        
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="4">4</button>
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="5">5</button>
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="6">6</button>
                        <button class="calc-btn bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600" data-action="subtract">-</button>
                        
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="1">1</button>
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="2">2</button>
                        <button class="calc-btn num-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="3">3</button>
                        <button class="calc-btn bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600" data-action="add">+</button>
                        
                        <button class="calc-btn num-btn col-span-2 bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-num="0">0</button>
                        <button class="calc-btn bg-gray-100 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" data-action="decimal">.</button>
                        <button class="calc-btn bg-green-500 text-white py-3 rounded-lg hover:bg-green-600" data-action="equals">=</button>
                    </div>
                    <div class="flex space-x-3">
                        <button id="useCalcResult" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                            Sonucu Kullan
                        </button>
                        <button id="closeCalc" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let currentValue = '0';
        let previousValue = '';
        let operation = null;
        let shouldResetDisplay = false;

        const display = document.getElementById('calcDisplay');

        const updateDisplay = () => {
            display.value = currentValue;
        };

        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('num-btn')) {
                const num = e.target.dataset.num;
                if (shouldResetDisplay || currentValue === '0') {
                    currentValue = num;
                    shouldResetDisplay = false;
                } else {
                    currentValue += num;
                }
                updateDisplay();
            }

            if (e.target.dataset.action === 'decimal') {
                if (!currentValue.includes('.')) {
                    currentValue += '.';
                    updateDisplay();
                }
            }

            if (e.target.dataset.action === 'clear') {
                currentValue = '0';
                previousValue = '';
                operation = null;
                updateDisplay();
            }

            if (e.target.dataset.action === 'backspace') {
                if (currentValue.length > 1) {
                    currentValue = currentValue.slice(0, -1);
                } else {
                    currentValue = '0';
                }
                updateDisplay();
            }

            if (['add', 'subtract', 'multiply', 'divide'].includes(e.target.dataset.action)) {
                if (operation && !shouldResetDisplay) {
                    const result = this.calculate(previousValue, currentValue, operation);
                    currentValue = result.toString();
                    updateDisplay();
                }
                previousValue = currentValue;
                operation = e.target.dataset.action;
                shouldResetDisplay = true;
            }

            if (e.target.dataset.action === 'equals') {
                if (operation) {
                    const result = this.calculate(previousValue, currentValue, operation);
                    currentValue = result.toString();
                    updateDisplay();
                    operation = null;
                    shouldResetDisplay = true;
                }
            }
        });

        document.getElementById('useCalcResult').addEventListener('click', () => {
            const amount = parseFloat(currentValue);
            if (!isNaN(amount)) {
                document.getElementById('amount').value = amount.toFixed(2);
                this.showNotification('Hesaplama sonucu tutar alanına aktarıldı', 'success');
                document.body.removeChild(modal);
            }
        });

        document.getElementById('closeCalc').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    calculate(a, b, operation) {
        const numA = parseFloat(a);
        const numB = parseFloat(b);

        switch (operation) {
            case 'add': return numA + numB;
            case 'subtract': return numA - numB;
            case 'multiply': return numA * numB;
            case 'divide': return numB !== 0 ? numA / numB : 0;
            default: return 0;
        }
    }

    updateGoals() {
        const container = document.getElementById('goalsList');

        if (!container) return;

        if (this.goals.length === 0) {
            container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">Henüz hedef belirlenmemiş</p>';
            return;
        }

        container.innerHTML = this.goals.map(goal => {
            const spent = this.transactions
                .filter(t => t.type === 'expense' && t.category === goal.category)
                .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

            const percentage = goal.amount > 0 ? Math.min(100, (spent / goal.amount) * 100) : 0;
            const remaining = goal.amount - spent;
            const isOverBudget = spent > goal.amount;

            return `
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border ${isOverBudget ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-600'}">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium text-sm text-gray-800 dark:text-gray-200">${goal.category}</span>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm ${remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                ${remaining >= 0 ? 'Kalan' : 'Aşan'}: ₺${Math.abs(remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </span>
                            <button onclick="budgetTracker.deleteGoal(${goal.id})" 
                                class="text-gray-400 hover:text-red-500 transition-colors">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div class="h-2 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-indigo-600'}" 
                             style="width: ${percentage}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>₺${spent.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                        <span>₺${goal.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    deleteGoal(id) {
        const goal = this.goals.find(g => g.id === id);
        if (confirm(`"${goal.category}" hedefini silmek istediğinizden emin misiniz?`)) {
            this.goals = this.goals.filter(g => g.id !== id);
            this.saveToLocalStorage();
            this.updateGoals();
            this.showNotification('Bütçe hedefi silindi', 'info');
        }
    }

    checkBudgetAlerts(transaction) {
        if (transaction.type !== 'expense') return;
        const goal = this.goals.find(g => g.category === transaction.category);
        if (!goal) return;
        // Only consider current month spending for alerts
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const spentThisMonth = this.transactions
            .filter(t => t.type === 'expense' && t.category === transaction.category)
            .filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === month && d.getFullYear() === year;
            })
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const ratio = goal.amount > 0 ? (spentThisMonth / goal.amount) * 100 : 0;
        const cat = transaction.category;
        if (!this.notifiedThresholds[cat]) this.notifiedThresholds[cat] = {};

        const thresholds = [50, 75, 100];
        thresholds.forEach(th => {
            if (ratio >= th && !this.notifiedThresholds[cat][th]) {
                const type = th < 100 ? 'warning' : 'error';
                const label = th === 100 ? 'AŞILDI' : `%${th} seviyesine ulaşıldı`;
                this.showNotification(`${cat} hedefi ${label}`, th === 100 ? 'error' : 'warning');
                this.notifiedThresholds[cat][th] = true;
            }
        });
    }

    showUndoSnackbar(message) {
        const snackbar = document.createElement('div');
        snackbar.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-3';
        snackbar.style.maxWidth = '90vw';
        snackbar.innerHTML = `
            <span>${message}</span>
            <button id="undoDeleteBtn" class="bg-white text-gray-900 px-3 py-1 rounded font-semibold hover:bg-gray-200">Geri Al</button>
        `;
        document.body.appendChild(snackbar);
        const remove = () => snackbar.remove();
        setTimeout(remove, 5000);
        document.getElementById('undoDeleteBtn').addEventListener('click', () => {
            if (this._lastDeleted) {
                this.transactions.unshift(this._lastDeleted);
                this._lastDeleted = null;
                if (this._undoTimer) {
                    clearTimeout(this._undoTimer);
                    this._undoTimer = null;
                }
                this.saveToLocalStorage();
                this.updateUI();
                this.showNotification('Silme işlemi geri alındı', 'success');
            }
            remove();
        });
    }

    printReport() {
        const { income, expense, balance } = this.calculateBalance();
        const nowStr = new Date().toLocaleString('tr-TR');
        // Prepare chart images if available
        let categoryImg = '';
        let trendImg = '';
        try {
            if (this.categoryChart) categoryImg = this.categoryChart.toBase64Image();
            if (this.trendChart) trendImg = this.trendChart.toBase64Image();
        } catch (e) { /* ignore */ }

        const lastTransactions = this.transactions.slice(0, 10).map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${t.type === 'income' ? 'Gelir' : 'Gider'}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td style="text-align:right">₺${(parseFloat(t.amount) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
            <html>
              <head>
                <meta charset="utf-8" />
                <title>Finans Raporu</title>
                <style>
                  body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111827; }
                  h1 { font-size: 20px; margin: 0 0 16px; }
                  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
                  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
                  .muted { color: #6b7280; font-size: 12px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                  th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
                  th { text-align: left; background: #f9fafb; }
                  img { max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
                </style>
              </head>
              <body>
                <h1>Akıllı Bütçe - Finans Raporu</h1>
                <div class="muted">Rapor Tarihi: ${nowStr}</div>
                <div class="grid" style="margin:16px 0;">
                  <div class="card"><div class="muted">Toplam Gelir</div><div style="font-weight:700">₺${income.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div></div>
                  <div class="card"><div class="muted">Toplam Gider</div><div style="font-weight:700">₺${expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div></div>
                  <div class="card"><div class="muted">Net Bakiye</div><div style="font-weight:700">₺${balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div></div>
                </div>
                ${categoryImg ? `<h2 style="margin-top:16px;font-size:16px">Kategori Analizi</h2><img src="${categoryImg}" />` : ''}
                ${trendImg ? `<h2 style="margin-top:16px;font-size:16px">Aylık Trend</h2><img src="${trendImg}" />` : ''}
                <h2 style="margin-top:16px;font-size:16px">Son İşlemler</h2>
                <table>
                  <thead><tr><th>Tarih</th><th>Tip</th><th>Açıklama</th><th>Kategori</th><th>Tutar</th></tr></thead>
                  <tbody>
                    ${lastTransactions}
                  </tbody>
                </table>
                <script>window.onload = () => { window.print(); }</script>
              </body>
            </html>
        `);
        w.document.close();
    }

    // Settings management
    loadSettings() {
        try {
            const raw = localStorage.getItem('budgetSettings');
            if (!raw) return { defaultPeriod: 'month', defaultType: 'income', confirmDelete: true };
            const s = JSON.parse(raw);
            return {
                defaultPeriod: s.defaultPeriod || 'month',
                defaultType: s.defaultType || 'income',
                confirmDelete: s.confirmDelete !== false,
            };
        } catch (_) {
            return { defaultPeriod: 'month', defaultType: 'income', confirmDelete: true };
        }
    }

    saveSettings() {
        localStorage.setItem('budgetSettings', JSON.stringify(this.settings));
    }

    showSettingsDialog() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
        const s = this.settings || { defaultPeriod: 'month', defaultType: 'income', confirmDelete: true, accentColor: '#6366f1' };
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
                <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Ayarlar</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Varsayılan Grafik Dönemi</label>
                        <select id="settingsPeriod" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                            <option value="month" ${s.defaultPeriod === 'month' ? 'selected' : ''}>Bu Ay</option>
                            <option value="quarter" ${s.defaultPeriod === 'quarter' ? 'selected' : ''}>Bu Çeyrek</option>
                            <option value="year" ${s.defaultPeriod === 'year' ? 'selected' : ''}>Bu Yıl</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Varsayılan İşlem Tipi</label>
                        <select id="settingsType" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200">
                            <option value="income" ${s.defaultType === 'income' ? 'selected' : ''}>Gelir</option>
                            <option value="expense" ${s.defaultType === 'expense' ? 'selected' : ''}>Gider</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aksan Rengi</label>
                        <div class="flex items-center gap-2">
                            <input id="settingsAccent" type="color" value="${s.accentColor || '#6366f1'}" class="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600 bg-transparent">
                            <div class="flex gap-2">
                                ${['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'].map(c => `<button data-accent="${c}" class="w-6 h-6 rounded-full border" style="background:${c}"></button>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-700 dark:text-gray-300">Silmeden önce onay iste</span>
                        <label class="inline-flex items-center cursor-pointer">
                            <input id="settingsConfirmDelete" type="checkbox" class="sr-only" ${s.confirmDelete ? 'checked' : ''}>
                            <span class="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-indigo-600 relative">
                                <span class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all" style="transform: ${s.confirmDelete ? 'translateX(16px)' : 'translateX(0)'}"></span>
                            </span>
                        </label>
                    </div>
                    <div class="flex space-x-3">
                        <button id="saveSettingsBtn" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">Kaydet</button>
                        <button id="cancelSettingsBtn" class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">İptal</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); };
        document.getElementById('cancelSettingsBtn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        // Accent presets
        modal.querySelectorAll('[data-accent]')?.forEach(btn => btn.addEventListener('click', (ev) => {
            const c = ev.currentTarget.getAttribute('data-accent');
            const input = document.getElementById('settingsAccent');
            if (input && c) input.value = c;
        }));
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            const defaultPeriod = /** @type {HTMLSelectElement} */(document.getElementById('settingsPeriod')).value;
            const defaultType = /** @type {HTMLSelectElement} */(document.getElementById('settingsType')).value;
            const confirmDelete = /** @type {HTMLInputElement} */(document.getElementById('settingsConfirmDelete')).checked;
            const accentColor = /** @type {HTMLInputElement} */(document.getElementById('settingsAccent')).value || '#6366f1';
            this.settings = { defaultPeriod, defaultType, confirmDelete, accentColor };
            this.saveSettings();
            // Apply immediately
            this.chartPeriod = defaultPeriod;
            this.setTransactionType(defaultType);
            this.updateChart();
            try { document.documentElement.style.setProperty('--accent', accentColor); } catch (_) { }
            this.showNotification('Ayarlar kaydedildi', 'success');
            close();
        });
    }

    showNotification(message, type = 'info') {
        // Mevcut bildirimleri kontrol et ve container oluştur
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');

        // Type'a göre renkler ve ikonlar
        const configs = {
            success: {
                bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
                icon: 'fa-check-circle',
                iconBg: 'bg-green-400/30',
                title: 'Başarılı'
            },
            error: {
                bg: 'bg-gradient-to-r from-red-500 to-rose-600',
                icon: 'fa-exclamation-circle',
                iconBg: 'bg-red-400/30',
                title: 'Hata'
            },
            warning: {
                bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
                icon: 'fa-exclamation-triangle',
                iconBg: 'bg-amber-400/30',
                title: 'Uyarı'
            },
            info: {
                bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                icon: 'fa-info-circle',
                iconBg: 'bg-blue-400/30',
                title: 'Bilgi'
            }
        };

        const config = configs[type] || configs.info;

        notification.className = `${config.bg} text-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto transform translate-x-full opacity-0 transition-all duration-300 ease-out`;
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start gap-3">
                    <div class="${config.iconBg} p-2 rounded-xl">
                        <i class="fas ${config.icon} text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm">${config.title}</p>
                        <p class="text-sm text-white/90 mt-0.5">${message}</p>
                    </div>
                    <button class="toast-close text-white/70 hover:text-white transition-colors p-1">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
            </div>
            <div class="h-1 bg-white/20">
                <div class="toast-progress h-full bg-white/50 transition-all duration-[3000ms] ease-linear" style="width: 100%"></div>
            </div>
        `;

        container.appendChild(notification);

        // Animasyonlu giriş
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
            notification.classList.add('translate-x-0', 'opacity-100');
            // Progress bar başlat
            const progressBar = notification.querySelector('.toast-progress');
            if (progressBar) {
                requestAnimationFrame(() => {
                    progressBar.style.width = '0%';
                });
            }
        });

        // Kapatma fonksiyonu
        const closeToast = () => {
            notification.classList.remove('translate-x-0', 'opacity-100');
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                // Container boşsa sil
                if (container && container.children.length === 0) {
                    container.parentNode?.removeChild(container);
                }
            }, 300);
        };

        // Kapatma butonu
        notification.querySelector('.toast-close')?.addEventListener('click', closeToast);

        // Otomatik kapanma
        const autoCloseTimer = setTimeout(closeToast, 4000);

        // Hover'da otomatik kapanmayı durdur
        notification.addEventListener('mouseenter', () => clearTimeout(autoCloseTimer));
        notification.addEventListener('mouseleave', () => setTimeout(closeToast, 1000));
    }

    saveToLocalStorage() {
        const txKey = this.getStorageKey('budgetTransactions');
        const goalsKey = this.getStorageKey('budgetGoals');
        localStorage.setItem(txKey, JSON.stringify(this.transactions));
        localStorage.setItem(goalsKey, JSON.stringify(this.goals));
    }

    getStorageKey(base) {
        if (this.currentUser && this.currentUser.id) return `${base}_${this.currentUser.id}`;
        return base;
    }

    loadFromLocalStorage() {
        try {
            const txKey = this.getStorageKey('budgetTransactions');
            const goalsKey = this.getStorageKey('budgetGoals');
            const savedTransactions = localStorage.getItem(txKey);
            if (savedTransactions) {
                this.transactions = JSON.parse(savedTransactions);
            } else {
                this.transactions = [];
            }
            const savedGoals = localStorage.getItem(goalsKey);
            if (savedGoals) {
                this.goals = JSON.parse(savedGoals);
            } else {
                this.goals = [];
            }
        } catch (e) {
            console.error('Veri yüklenirken hata oluştu:', e);
            this.transactions = [];
            this.goals = [];
        }
    }

    updateQuickStats() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Bugünkü harcama
        const todayExpenses = this.transactions
            .filter(t => t.type === 'expense' && t.date === todayStr)
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        // Haftalık ortalama
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekTransactions = this.transactions.filter(t => new Date(t.date) >= weekAgo);
        const weekExpenses = weekTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const weeklyAvg = weekTransactions.length > 0 ? weekExpenses / 7 : 0;

        // En büyük harcama
        const allExpenses = this.transactions.filter(t => t.type === 'expense');
        const largestExpense = allExpenses.length > 0
            ? Math.max(...allExpenses.map(t => parseFloat(t.amount) || 0))
            : 0;

        // İşlem sayısı
        const transactionCount = this.transactions.length;

        // Update DOM
        const todayEl = document.getElementById('todayExpense');
        const weeklyEl = document.getElementById('weeklyAvg');
        const largestEl = document.getElementById('largestExpense');
        const countEl = document.getElementById('quickTransactionCount');

        if (todayEl) todayEl.textContent = `₺${todayExpenses.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        if (weeklyEl) weeklyEl.textContent = `₺${weeklyAvg.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        if (largestEl) largestEl.textContent = `₺${largestExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        if (countEl) countEl.textContent = transactionCount.toString();
    }

    updateUI() {
        this.updateBalanceDisplay();
        this.renderTransactions();
        this.updateChart();
        this.updateTrendChart();
        this.updateGoals();
        this.updateQuickStats();
    }
}

// Initialize the application
let budgetTracker;
document.addEventListener('DOMContentLoaded', () => {
    budgetTracker = new BudgetTracker();
    // Expose globally for inline handlers (HTML onclick) and external scripts
    window.budgetTracker = budgetTracker;
    budgetTracker.setTransactionType('income');
});
