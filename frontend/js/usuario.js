// ==========================================================================
// SCRIPT DE USUÁRIOS (CRUD CONECTADO AO SERVER.JS -> SUPABASE)
// ==========================================================================

let usersList = [];
let currentEditingUserId = null;
let currentDeletingUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Carregar os usuários assim que a tela abre
    loadUsers();

    // 2. Mapeamento de Botões e Modais
    const btnOpenModal = document.getElementById('btnOpenModal');
    const btnSaveNewUser = document.getElementById('btnSaveNewUser');
    const btnUpdateUser = document.getElementById('btnUpdateUser');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const searchInput = document.getElementById('searchUsers');

    // Botão de Novo Usuário
    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            clearAddForm();
            openModal('addUserModal', 'modalContent');
        });
    }

    // Botão Salvar Novo Usuário
    if (btnSaveNewUser) {
        btnSaveNewUser.addEventListener('click', saveNewUser);
    }

    // Botão Salvar Edição
    if (btnUpdateUser) {
        btnUpdateUser.addEventListener('click', saveEditUser);
    }

    // Botão Confirmar Exclusão
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', confirmDeleteUser);
    }

    // Campo de Busca
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = usersList.filter(u => 
                (u.nome_completo && u.nome_completo.toLowerCase().includes(term)) || 
                (u.email && u.email.toLowerCase().includes(term))
            );
            renderTable(filtered);
        });
    }

    // Fechar modais ao clicar nos botões de cancelar ou no X
    document.querySelectorAll('#btnCloseModal, #btnCancelModal, .close-edit-modal, .close-delete-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
});

// ==========================================================================
// FUNÇÕES DE COMUNICAÇÃO COM A API (SERVER.JS)
// ==========================================================================

// Buscar todos os usuários (GET)
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Erro ao buscar usuários');
        
        usersList = await response.json();
        renderTable(usersList);
    } catch (error) {
        console.error("Erro na conexão:", error);
        alert("Não foi possível carregar a lista de usuários.");
    }
}

// Criar novo usuário (POST)
async function saveNewUser(e) {
    e.preventDefault(); // Evita recarregar a tela
    
    const nome = document.getElementById('nomeUser').value.trim();
    const email = document.getElementById('emailUser').value.trim();
    const funcao = document.getElementById('funcaoUser').value;
    const senha = document.getElementById('senhaUser').value.trim();

    if (!nome || !email || !senha) {
        alert("Preencha os campos obrigatórios (Nome, E-mail e Senha).");
        return;
    }

    const btn = document.getElementById('btnSaveNewUser');
    btn.innerHTML = 'Salvando...';

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome_completo: nome, email, funcao, senha })
        });

        if (response.ok) {
            closeAllModals();
            loadUsers(); // Recarrega a tabela atualizada
        } else {
            const err = await response.json();
            alert("Erro ao salvar: " + (err.error || err.message));
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao conectar com o servidor.");
    } finally {
        btn.innerHTML = 'Salvar Usuário';
    }
}

// Atualizar usuário existente (PUT)
async function saveEditUser(e) {
    e.preventDefault();
    if (!currentEditingUserId) return;

    const nome = document.getElementById('editNomeUser').value.trim();
    const funcao = document.getElementById('editFuncaoUser').value;
    const senha = document.getElementById('editSenhaUser').value.trim(); // Se vazio, backend ignora
    
    const btn = document.getElementById('btnUpdateUser');
    btn.innerHTML = 'Atualizando...';

    try {
        const response = await fetch(`/api/users/${currentEditingUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome_completo: nome, funcao, senha: senha || undefined })
        });

        if (response.ok) {
            closeAllModals();
            loadUsers();
        } else {
            alert("Erro ao atualizar usuário.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao conectar com o servidor.");
    } finally {
        btn.innerHTML = 'Salvar Alterações';
    }
}

// Deletar usuário (DELETE)
async function confirmDeleteUser() {
    if (!currentDeletingUserId) return;

    const btn = document.getElementById('btnConfirmDelete');
    btn.innerHTML = 'Excluindo...';

    try {
        const response = await fetch(`/api/users/${currentDeletingUserId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            closeAllModals();
            loadUsers();
        } else {
            alert("Erro ao excluir usuário.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao conectar com o servidor.");
    } finally {
        btn.innerHTML = 'Sim, Excluir';
    }
}

// ==========================================================================
// FUNÇÕES DE INTERFACE (TABELA E MODAIS)
// ==========================================================================

function renderTable(users) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    tbody.innerHTML = ''; // Limpa a tabela estática do HTML

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const date = user.data_registro ? new Date(user.data_registro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
        
        // Estilo das Tags (Admin vs Operador)
        const isOperador = user.funcao === 'operador';
        const roleClass = isOperador 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
            : 'bg-blue-500/20 text-blue-400 border-blue-500/20';
        
        // Avatar Dinâmico
        const avatarBg = isOperador ? '0B1120' : '1E3A5F';
        const avatarColor = isOperador ? 'A0A5AB' : 'fff';
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome_completo || 'User')}&background=${avatarBg}&color=${avatarColor}`;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-white/5 transition-all duration-200 group';
        tr.innerHTML = `
            <td class="py-3 px-6">
                <div class="flex items-center gap-3">
                    <img src="${avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full border border-white/10">
                    <span class="font-medium text-white group-hover:text-vectra-light transition-colors">${user.nome_completo}</span>
                </div>
            </td>
            <td class="py-3 px-6 text-slate-300">${user.email}</td>
            <td class="py-3 px-6">
                <span class="px-2.5 py-1 text-[11px] font-medium rounded-full border uppercase tracking-wide ${roleClass}">
                    ${user.funcao}
                </span>
            </td>
            <td class="py-3 px-6 text-slate-400">
                <div class="flex items-center gap-2">
                    <i class="ph ph-calendar-blank text-lg"></i>
                    <span>${date}</span>
                </div>
            </td>
            <td class="py-3 px-6 text-slate-400 font-mono tracking-[0.2em]">••••••••</td>
            <td class="py-3 px-6 text-right">
                <div class="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button onclick="openEditModal(${user.id})" class="p-1.5 hover:bg-vectra-light/20 hover:text-vectra-light rounded-lg transition-colors" title="Editar">
                        <i class="ph ph-pencil-simple text-[1.1rem]"></i>
                    </button>
                    <button onclick="openDeleteModal(${user.id})" class="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Excluir">
                        <i class="ph ph-trash text-[1.1rem]"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditModal(id) {
    const user = usersList.find(u => u.id === id);
    if (!user) return;

    currentEditingUserId = id;
    
    // Preenche os campos do modal de edição
    document.getElementById('editNomeUser').value = user.nome_completo;
    document.getElementById('editEmailUser').value = user.email; // desativado no HTML
    document.getElementById('editFuncaoUser').value = user.funcao;
    document.getElementById('editSenhaUser').value = ''; // Limpa para a pessoa não ver a hash
    
    openModal('editUserModal', 'editModalContent');
}

function openDeleteModal(id) {
    const user = usersList.find(u => u.id === id);
    if (!user) return;

    currentDeletingUserId = id;
    
    // Atualiza o texto do modal dinamicamente
    const textContainer = document.querySelector('#deleteModalContent p');
    if (textContainer) {
        textContainer.innerHTML = `Tem certeza que deseja excluir <span class="text-white font-medium">${user.nome_completo}</span>? Esta ação não pode ser desfeita.`;
    }

    openModal('deleteUserModal', 'deleteModalContent');
}

// Animação de Abrir e Fechar Modais (Adaptada ao seu CSS do Tailwind)
function openModal(modalId, contentId) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    if (!modal || !content) return;
    
    modal.classList.remove('hidden');
    // Pequeno atraso para a transição funcionar
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);
}

function closeAllModals() {
    ['addUserModal', 'editUserModal', 'deleteUserModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('opacity-0');
            const content = modal.querySelector('div[id$="ModalContent"]');
            if (content) content.classList.add('scale-95');
            
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300); // Tempo da animação no Tailwind
        }
    });
}

function clearAddForm() {
    document.getElementById('nomeUser').value = '';
    document.getElementById('emailUser').value = '';
    document.getElementById('funcaoUser').value = 'operador';
    document.getElementById('senhaUser').value = '';
}
