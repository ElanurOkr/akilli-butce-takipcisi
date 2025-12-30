// Akıllı Bütçe Takipçisi - JavaScript Application
class BudgetTracker {
    constructor() {
        this.transactions = [];
        this.currentFilter = 'all';
        this.transactionType = 'income';
        this.chart = null;
        
        this.categories = {
            income: ['Maaş', 'Freelance', 'Yatırım', 'Hediye', 'Diğer Gelir'],
            expense: ['Market', 'Eğlence', 'Ulaşım', 'Faturalar', 'Sağlık', 'Eğitim', 'Giyim', 'Kira', 'Diğer Gider']
        };
        
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.setDefaultDate();
        this.updateCategoryOptions();
        this.updateUI();
        this.initChart();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Transaction type buttons
        document.getElementById('incomeBtn').addEventListener('click', () => {
            this.setTransactionType('income');
        });

        document.getElementById('expenseBtn').addEventListener('click', () => {
            this.setTransactionType('expense');
        });

        // Filter buttons
        document.getElementById('filterAll').addEventListener('click', () => {
            this.setFilter('all');
        });

        document.getElementById('filterIncome').addEventListener('click', () => {
            this.setFilter('income');
        });

        document.getElementById('filterExpense').addEventListener('click', () => {
            this.setFilter('expense');
        });
    }

    setTransactionType(type) {
        this.transactionType = type;
        
        // Update button styles
        const incomeBtn = document.getElementById('incomeBtn');
        const expenseBtn = document.getElementById('expenseBtn');
        
        if (type === 'income') {
            incomeBtn.classList.add('bg-green-500', 'text-white', 'border-green-500');
            incomeBtn.classList.remove('border-gray-300', 'text-gray-700');
            expenseBtn.classList.remove('bg-red-500', 'text-white', 'border-red-500');
            expenseBtn.classList.add('border-gray-300', 'text-gray-700');
        } else {
            expenseBtn.classList.add('bg-red-500', 'text-white', 'border-red-500');
            expenseBtn.classList.remove('border-gray-300', 'text-gray-700');
            incomeBtn.classList.remove('bg-green-500', 'text-white', 'border-green-500');
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
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update button styles
        const filterButtons = {
            all: document.getElementById('filterAll'),
            income: document.getElementById('filterIncome'),
            expense: document.getElementById('filterExpense')
        };
        
        Object.keys(filterButtons).forEach(key => {
            if (key === filter) {
                filterButtons[key].classList.add('bg-indigo-600', 'text-white');
                filterButtons[key].classList.remove('bg-gray-200', 'text-gray-700');
            } else {
                filterButtons[key].classList.remove('bg-indigo-600', 'text-white');
                filterButtons[key].classList.add('bg-gray-200', 'text-gray-700');
            }
        });
        
        this.renderTransactions();
    }

    addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!description || !amount || !category || !date) {
            this.showNotification('Lütfen tüm alanları doldurun', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            type: this.transactionType,
            description,
            amount,
            category,
            date,
            timestamp: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveToLocalStorage();
        this.updateUI();
        this.resetForm();
        this.showNotification('İşlem başarıyla eklendi', 'success');
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToLocalStorage();
        this.updateUI();
        this.showNotification('İşlem silindi', 'info');
    }

    resetForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();
    }

    calculateBalance() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        return { income, expense, balance: income - expense };
    }

    updateBalanceDisplay() {
        const { income, expense, balance } = this.calculateBalance();
        
        document.getElementById('totalIncome').textContent = `₺${income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `₺${expense.toFixed(2)}`;
        
        const balanceElement = document.getElementById('netBalance');
        balanceElement.textContent = `₺${balance.toFixed(2)}`;
        
        // Update balance color based on positive/negative
        balanceElement.classList.remove('text-green-600', 'text-red-600', 'text-indigo-600');
        if (balance > 0) {
            balanceElement.classList.add('text-green-600');
        } else if (balance < 0) {
            balanceElement.classList.add('text-red-600');
        } else {
            balanceElement.classList.add('text-indigo-600');
        }
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        const emptyState = document.getElementById('emptyState');
        
        let filteredTransactions = this.transactions;
        if (this.currentFilter !== 'all') {
            filteredTransactions = this.transactions.filter(t => t.type === this.currentFilter);
        }

        if (filteredTransactions.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';

        container.innerHTML = filteredTransactions.map(transaction => {
            const isIncome = transaction.type === 'income';
            const icon = isIncome ? 'fa-arrow-up' : 'fa-arrow-down';
            const colorClass = isIncome ? 'text-green-600' : 'text-red-600';
            const bgColorClass = isIncome ? 'bg-green-50' : 'bg-red-50';
            const sign = isIncome ? '+' : '-';

            return `
                <div class="transaction-item bg-white rounded-lg p-4 shadow-sm hover:shadow-md border-l-4 ${isIncome ? 'border-green-500' : 'border-red-500'}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="${bgColorClass} p-2 rounded-full">
                                <i class="fas ${icon} ${colorClass}"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800">${transaction.description}</h3>
                                <div class="flex items-center space-x-2 text-sm text-gray-600">
                                    <span class="category-badge px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                                        ${transaction.category}
                                    </span>
                                    <span>•</span>
                                    <span>${this.formatDate(transaction.date)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="font-bold text-lg ${colorClass}">
                                ${sign}₺${transaction.amount.toFixed(2)}
                            </span>
                            <button onclick="budgetTracker.deleteTransaction(${transaction.id})" 
                                class="text-gray-400 hover:text-red-500 transition-colors">
                                <i class="fas fa-trash"></i>
                            </button>
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

    initChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6',
                        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ₺${value.toFixed(2)} (%${percentage})`;
                            }
                        }
                    }
                }
            }
        });
        
        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;

        const expenseTransactions = this.transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenseTransactions.forEach(transaction => {
            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }
            categoryTotals[transaction.category] += transaction.amount;
        });

        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8); // Show top 8 categories

        this.chart.data.labels = sortedCategories.map(([category]) => category);
        this.chart.data.datasets[0].data = sortedCategories.map(([, total]) => total);
        this.chart.update();
    }

    updateUI() {
        this.updateBalanceDisplay();
        this.renderTransactions();
        this.updateChart();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    saveToLocalStorage() {
        localStorage.setItem('budgetTransactions', JSON.stringify(this.transactions));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('budgetTransactions');
        if (saved) {
            try {
                this.transactions = JSON.parse(saved);
            } catch (e) {
                console.error('Veri yüklenirken hata oluştu:', e);
                this.transactions = [];
            }
        }
    }
}

// Initialize the application
let budgetTracker;
document.addEventListener('DOMContentLoaded', () => {
    budgetTracker = new BudgetTracker();
    
    // Set initial transaction type
    budgetTracker.setTransactionType('income');
});
