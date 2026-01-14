// ========== CONFIGURAÇÃO INICIAL ==========
console.log('🚀 Diário de Bordo PWA - Inicializando...');

// Variáveis globais
let entries = [];
let deferredPrompt = null;
let entryToDelete = null;

// Elementos DOM
const elements = {
    entryForm: document.getElementById('entryForm'),
    titleInput: document.getElementById('title'),
    descriptionInput: document.getElementById('description'),
    dateInput: document.getElementById('date'),
    entriesContainer: document.getElementById('entriesContainer'),
    emptyState: document.getElementById('emptyState'),
    entryCount: document.getElementById('entryCount'),
    clearBtn: document.getElementById('clearBtn'),
    installBtn: document.getElementById('installBtn'),
    offlineStatus: document.getElementById('offlineStatus'),
    swStatus: document.getElementById('swStatus'),
    storageStatus: document.getElementById('storageStatus'),
    deleteModal: document.getElementById('deleteModal'),
    cancelDeleteBtn: document.getElementById('cancelDelete'),
    confirmDeleteBtn: document.getElementById('confirmDelete'),
    debugBtn: document.getElementById('debugBtn'),
    debugModal: document.getElementById('debugModal'),
    closeDebugBtn: document.getElementById('closeDebugBtn'),
    clearCacheBtn: document.getElementById('clearCacheBtn'),
    unregisterSWBtn: document.getElementById('unregisterSWBtn'),
    swDebugInfo: document.getElementById('swDebugInfo'),
    cacheDebugInfo: document.getElementById('cacheDebugInfo'),
    dataDebugInfo: document.getElementById('dataDebugInfo')
};

// ========== FUNÇÕES PRINCIPAIS ==========

// Inicializar aplicação
function initApp() {
    console.log('🔧 Inicializando aplicação...');
    
    // Configurar data atual (corrigido para usar data local)
    setCurrentDate();
    
    // Carregar dados
    loadEntries();
    
    // Configurar eventos
    setupEventListeners();
    
    // Inicializar PWA
    initPWA();
    
    // Atualizar status inicial
    updateOnlineStatus();
    
    console.log('✅ Aplicação inicializada com sucesso!');
}

// Configurar data atual sem problemas de fuso horário
function setCurrentDate() {
    const now = new Date();
    // Formatar como YYYY-MM-DD para evitar problemas de fuso horário
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    elements.dateInput.value = `${year}-${month}-${day}`;
}

// Configurar event listeners
function setupEventListeners() {
    // Formulário
    elements.entryForm.addEventListener('submit', handleFormSubmit);
    elements.clearBtn.addEventListener('click', handleClearForm);
    
    // Modal de exclusão
    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    elements.deleteModal.addEventListener('click', (e) => {
        if (e.target === elements.deleteModal) closeDeleteModal();
    });
    
    // Debug
    elements.debugBtn.addEventListener('click', showDebugModal);
    elements.closeDebugBtn.addEventListener('click', () => elements.debugModal.style.display = 'none');
    elements.clearCacheBtn.addEventListener('click', handleClearCache);
    elements.unregisterSWBtn.addEventListener('click', handleUnregisterSW);
    
    // Status online/offline
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

// ========== GERENCIAMENTO DE DADOS ==========

// Carregar entradas do localStorage
function loadEntries() {
    try {
        const savedEntries = localStorage.getItem('diaryEntries');
        
        if (savedEntries) {
            entries = JSON.parse(savedEntries);
            console.log(`📂 ${entries.length} entradas carregadas`);
        } else {
            entries = [];
            console.log('📂 Nenhuma entrada encontrada');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar entradas:', error);
        entries = [];
    }
    
    renderEntries();
    updateEntryCount();
    updateStorageStatus();
}

// Salvar entradas no localStorage
function saveEntries() {
    try {
        localStorage.setItem('diaryEntries', JSON.stringify(entries));
        console.log('💾 Entradas salvas');
    } catch (error) {
        console.error('❌ Erro ao salvar entradas:', error);
        showNotification('Erro ao salvar! Tente novamente.', 'error');
    }
    updateStorageStatus();
}

// Atualizar contador
function updateEntryCount() {
    elements.entryCount.textContent = entries.length;
}

// Atualizar status de armazenamento
function updateStorageStatus() {
    try {
        const usedSpace = JSON.stringify(entries).length;
        let statusText;
        
        if (usedSpace < 1024) {
            statusText = `${usedSpace} bytes`;
        } else if (usedSpace < 1024 * 1024) {
            statusText = `${(usedSpace / 1024).toFixed(1)} KB`;
        } else {
            statusText = `${(usedSpace / (1024 * 1024)).toFixed(2)} MB`;
        }
        
        elements.storageStatus.textContent = `Armazenamento: ${statusText}`;
    } catch (error) {
        elements.storageStatus.textContent = 'Armazenamento disponível';
    }
}

// Renderizar entradas
function renderEntries() {
    if (!entries || entries.length === 0) {
        elements.emptyState.style.display = 'block';
        elements.entriesContainer.innerHTML = '';
        elements.entriesContainer.appendChild(elements.emptyState);
        return;
    }
    
    elements.emptyState.style.display = 'none';
    
    // Ordenar por data (mais recente primeiro)
    const sortedEntries = [...entries].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    elements.entriesContainer.innerHTML = '';
    
    sortedEntries.forEach((entry, index) => {
        const entryElement = document.createElement('div');
        entryElement.className = 'entry';
        
        // Formatar data para exibição (corrigido para usar data brasileira)
        const formattedDate = formatDateForDisplay(entry.date);
        
        entryElement.innerHTML = `
            <div class="entry-header">
                <div>
                    <h3 class="entry-title">${escapeHtml(entry.title || 'Sem título')}</h3>
                </div>
                <span class="entry-date">${formattedDate}</span>
            </div>
            <p class="entry-description">${escapeHtml(entry.description || 'Sem descrição')}</p>
            <div class="entry-actions">
                <button class="delete-btn" data-id="${entry.id}">
                    🗑️ Excluir
                </button>
            </div>
        `;
        
        elements.entriesContainer.appendChild(entryElement);
    });
    
    // Adicionar eventos aos botões de excluir
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const entryId = parseInt(e.target.dataset.id);
            showDeleteModal(entryId);
        });
    });
}

// Formatar data para exibição (corrige problema de fuso horário)
function formatDateForDisplay(dateString) {
    if (!dateString) return 'Data não informada';
    
    try {
        // Criar data considerando o formato YYYY-MM-DD como data local
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Mês é 0-indexed
        
        // Formatar em português brasileiro
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dateString; // Retorna a string original em caso de erro
    }
}

// Escapar HTML (segurança)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Adicionar entrada (CORRIGIDO - mantém a data exata do input)
function addEntry(title, description, date) {
    // A data já vem no formato YYYY-MM-DD do input, usamos diretamente
    const newEntry = {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        date: date // Usamos a string diretamente, sem conversão
    };
    
    entries.push(newEntry);
    saveEntries();
    renderEntries();
    updateEntryCount();
    
    showNotification('✅ Entrada salva com sucesso!', 'success');
}

// Remover entrada
function removeEntry(entryId) {
    const index = entries.findIndex(entry => entry.id === entryId);
    
    if (index !== -1) {
        const removedEntry = entries.splice(index, 1)[0];
        saveEntries();
        renderEntries();
        updateEntryCount();
        
        showNotification(`🗑️ "${removedEntry.title}" excluída!`, 'error');
    }
}

// ========== HANDLERS DE EVENTOS ==========

// Handler do formulário
function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = elements.titleInput.value;
    const description = elements.descriptionInput.value;
    const date = elements.dateInput.value;
    
    console.log('Data selecionada:', date); // Para debug
    
    if (title && description && date) {
        addEntry(title, description, date);
        
        // Limpar formulário e manter a mesma data selecionada
        elements.titleInput.value = '';
        elements.descriptionInput.value = '';
        // Não alteramos a data, mantém a que o usuário selecionou
        elements.titleInput.focus();
    } else {
        showNotification('⚠️ Preencha todos os campos!', 'warning');
    }
}

// Handler limpar formulário
function handleClearForm() {
    elements.titleInput.value = '';
    elements.descriptionInput.value = '';
    setCurrentDate(); // Volta para data atual
    elements.titleInput.focus();
    showNotification('📝 Formulário limpo!', 'info');
}

// Handler confirmar exclusão
function handleConfirmDelete() {
    if (entryToDelete !== null) {
        removeEntry(entryToDelete);
        closeDeleteModal();
    }
}

// ========== MODAL DE EXCLUSÃO ==========

function showDeleteModal(entryId) {
    entryToDelete = entryId;
    elements.deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
    entryToDelete = null;
    elements.deleteModal.style.display = 'none';
}

// ========== NOTIFICAÇÕES ==========

function showNotification(message, type = 'info') {
    // Remover notificações anteriores
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ========== PWA FUNCTIONALITY ==========

// Inicializar PWA
function initPWA() {
    // Registrar Service Worker
    registerServiceWorker();
    
    // Configurar instalação
    setupInstallPrompt();
    
    // Verificar se já está instalado
    checkIfInstalled();
}

// Registrar Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        console.log('🔧 Registrando Service Worker...');
        
        // Usar caminho absoluto para evitar problemas
        const swUrl = './service-worker.js';
        
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('✅ Service Worker registrado com sucesso:', registration.scope);
                
                // Mostrar status
                elements.swStatus.style.display = 'flex';
                
                // Verificar atualizações
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Nova versão do Service Worker encontrada');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showNotification('🔄 Nova versão disponível! Recarregue a página.', 'info');
                        }
                    });
                });
                
                // Forçar atualização
                registration.update();
            })
            .catch(error => {
                console.error('❌ Falha ao registrar Service Worker:', error);
                showNotification('⚠️ Algumas funcionalidades offline podem não estar disponíveis', 'warning');
            });
    } else {
        console.log('❌ Service Worker não suportado');
        showNotification('⚠️ Seu navegador não suporta aplicativos offline', 'warning');
    }
}

// Configurar prompt de instalação
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('📲 Evento beforeinstallprompt disparado');
        
        e.preventDefault();
        deferredPrompt = e;
        
        // Mostrar botão de instalação
        elements.installBtn.style.display = 'flex';
        
        elements.installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            
            const choiceResult = await deferredPrompt.userChoice;
            
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ Usuário aceitou instalação');
                showNotification('🎉 Aplicativo instalado com sucesso!', 'success');
            } else {
                console.log('❌ Usuário recusou instalação');
            }
            
            deferredPrompt = null;
            elements.installBtn.style.display = 'none';
        });
    });
}

// Verificar se já está instalado
function checkIfInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('📱 App executando em modo standalone');
        elements.installBtn.style.display = 'none';
    }
    
    // iOS
    if (window.navigator.standalone === true) {
        console.log('📱 iOS em modo standalone');
        elements.installBtn.style.display = 'none';
    }
}

// Atualizar status online/offline
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const statusElement = elements.offlineStatus.querySelector('span');
    
    if (isOnline) {
        statusElement.textContent = '● Online';
        statusElement.className = 'online';
        document.body.classList.remove('offline-mode');
    } else {
        statusElement.textContent = '● Offline';
        statusElement.className = 'offline';
        document.body.classList.add('offline-mode');
        showNotification('🔴 Modo offline ativado', 'info');
    }
}

// ========== DEBUG FUNCTIONS ==========

// Mostrar modal de debug
function showDebugModal() {
    updateDebugInfo();
    elements.debugModal.style.display = 'flex';
}

// Atualizar informações de debug
async function updateDebugInfo() {
    // Service Worker info
    let swInfo = '';
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            swInfo = `Registrado: Sim\nScope: ${registration.scope}\nEstado: ${registration.active ? 'Ativo' : 'Inativo'}`;
        } else {
            swInfo = 'Registrado: Não';
        }
    } else {
        swInfo = 'Não suportado';
    }
    elements.swDebugInfo.textContent = swInfo;
    
    // Cache info
    let cacheInfo = '';
    if ('caches' in window) {
        try {
            const cache = await caches.open('diario-bordo-v1');
            const keys = await cache.keys();
            cacheInfo = `Arquivos em cache: ${keys.length}\n`;
            keys.forEach((key, i) => {
                cacheInfo += `${i+1}. ${key.url.replace(window.location.origin, '')}\n`;
            });
        } catch (e) {
            cacheInfo = `Erro: ${e.message}`;
        }
    } else {
        cacheInfo = 'Não suportado';
    }
    elements.cacheDebugInfo.textContent = cacheInfo;
    
    // Data info
    const dataInfo = `Entradas: ${entries.length}\nTamanho: ${JSON.stringify(entries).length} bytes\nLocalStorage: ${typeof(Storage) !== 'undefined' ? 'Suportado' : 'Não suportado'}`;
    elements.dataDebugInfo.textContent = dataInfo;
}

// Handler limpar cache
async function handleClearCache() {
    if ('caches' in window) {
        const deleted = await caches.delete('diario-bordo-v1');
        showNotification(deleted ? '✅ Cache limpo!' : '❌ Erro ao limpar cache', deleted ? 'success' : 'error');
        updateDebugInfo();
    }
}

// Handler remover Service Worker
async function handleUnregisterSW() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.unregister();
            showNotification('✅ Service Worker removido! Recarregue a página.', 'success');
            elements.swStatus.style.display = 'none';
            updateDebugInfo();
        }
    }
}

// ========== INICIALIZAÇÃO ==========

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ========== FUNÇÕES GLOBAIS PARA DEBUG ==========

// Adicionar entradas de teste
window.addTestEntries = function() {
    const testData = [
        { 
            title: "Reunião de Equipe", 
            description: "Reunião semanal para alinhamento de projetos", 
            date: new Date().toISOString().split('T')[0] // Data atual no formato YYYY-MM-DD
        },
        { 
            title: "Desenvolvimento PWA", 
            description: "Implementação do Diário de Bordo como PWA", 
            date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Ontem
        },
        { 
            title: "Testes Offline", 
            description: "Verificação do funcionamento sem conexão à internet", 
            date: new Date(Date.now() - 172800000).toISOString().split('T')[0] // Anteontem
        }
    ];
    
    testData.forEach(entry => addEntry(entry.title, entry.description, entry.date));
};

// Verificar status do PWA
window.checkPWAStatus = function() {
    console.log('=== STATUS DO PWA ===');
    console.log('Service Worker:', 'serviceWorker' in navigator ? 'Suportado' : 'Não suportado');
    console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser');
    console.log('Online:', navigator.onLine);
    console.log('Entradas:', entries.length);
    console.log('Deferred Prompt:', deferredPrompt ? 'Disponível' : 'Não disponível');
    console.log('====================');
};

// Função utilitária para debug de datas
window.debugDate = function(dateString) {
    console.log('=== DEBUG DE DATA ===');
    console.log('String original:', dateString);
    
    const [year, month, day] = dateString.split('-').map(Number);
    console.log('Partes:', { year, month, day });
    
    const date = new Date(year, month - 1, day);
    console.log('Objeto Date criado:', date);
    console.log('Date.toISOString():', date.toISOString());
    console.log('Date.toLocaleDateString():', date.toLocaleDateString('pt-BR'));
    console.log('====================');
};