// backend/usuario.js - User management for usuarios.html
// Connected to MySQL via /api/users (server.js)

let users = [];
let currentEditingUser = null;
let userToDelete = null;


document.addEventListener('DOMContentLoaded', function() {
  // Bind event listeners
  bindEvents();
  loadUsers();
  
updateHeaderAvatar();


let loggedUser = localStorage.getItem('loggedUser') ? JSON.parse(localStorage.getItem('loggedUser')) : null;

function updateHeaderAvatar() {
  const userAvatar = document.getElementById('userAvatarHeader');
  if (!userAvatar) return;

  let user = loggedUser || users.find(u => (u.role || u.funcao) === 'admin') || users[0] || { name: 'Admin Vectra', role: 'admin' };
  
  const name = user.name || user.nome_completo || user.nome || 'Admin Vectra';
  const isAdmin = (user.role || user.funcao) === 'admin';
  
  userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${isAdmin ? '4FA3FF' : '1E3A5F'}&color=fff&bold=${isAdmin}`;
  userAvatar.title = name + ' (' + (isAdmin ? 'Admin' : 'Operador') + ')';
}

// Chama após login/sucesso
function setLoggedUser(user) {
  loggedUser = user;
  localStorage.setItem('loggedUser', JSON.stringify(user));
  updateHeaderAvatar();
}


});


// Step 4 from TODO: Minor update for dynamic delete name
function bindEvents() {
  // Search input
  const searchInput = document.getElementById('searchUsers');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => filterTable(e.target.value.toLowerCase()), 300);
    });
  }

  // New user modal
  document.getElementById('btnOpenModal')?.addEventListener('click', openNewUserModal);
  document.getElementById('btnSaveNewUser')?.addEventListener('click', saveNewUser);
  document.getElementById('btnCancelModal')?.addEventListener('click', closeAllModals);
  document.getElementById('btnCloseModal')?.addEventListener('click', closeAllModals);
  
  // Edit modal cancel/close buttons
  document.querySelector('.close-edit-modal')?.addEventListener('click', closeAllModals);
  
  // Delete modal cancel/close buttons
  document.querySelector('.close-delete-modal')?.addEventListener('click', closeAllModals);

  // Edit modal
  document.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', openEditUserModal);
  });

  // Delete modal
  document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', openDeleteUserModal);
  });

  document.getElementById('btnUpdateUser')?.addEventListener('click', updateUser);
  document.getElementById('btnConfirmDelete')?.addEventListener('click', confirmDeleteUser);

  // Close modals on overlay click
  document.querySelectorAll('[id$="Modal"]').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  // Dynamic event delegation for table (new rows)
  document.getElementById('userTableBody')?.addEventListener('click', handleTableActions);
}

function handleTableActions(e) {
  if (e.target.closest('.btn-edit-user')) {
    openEditUserModal(e);
  } else if (e.target.closest('.btn-delete-user')) {
    openDeleteUserModal(e);
  }
}

async function loadUsers() {
  try {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    users = await response.json();
    renderTable();
  } catch (error) {
    console.error('Load users error:', error);
    alert('Erro ao carregar usuários. Verifique se o servidor está rodando.');
  }
}

let filteredUsers = [];

function filterTable(searchTerm) {
  filteredUsers = users.filter(user => 
    (user.name || user.nome_completo || '').toLowerCase().includes(searchTerm) ||
    (user.email || '').toLowerCase().includes(searchTerm)
  );
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  const displayUsers = filteredUsers.length > 0 ? filteredUsers : users;
  tbody.innerHTML = displayUsers.map((user, index) => `
    <tr class="hover:bg-white/5 transition-all duration-200 group">
      <td class="py-3 px-6">
        <div class="flex items-center gap-3">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.nome_completo)}&background=1E3A5F&color=fff" alt="Avatar" class="w-8 h-8 rounded-full border border-white/10">
          <span class="font-medium text-white group-hover:text-vectra-light transition-colors">${user.name || user.nome_completo}</span>
        </div>
      </td>
      <td class="py-3 px-6 text-slate-300">${user.email}</td>
      <td class="py-3 px-6">
        <span class="px-2.5 py-1 text-[11px] font-medium rounded-full bg-${(user.role || user.funcao) === 'admin' ? 'blue' : 'emerald'}-500/20 text-${(user.role || user.funcao) === 'admin' ? 'blue' : 'emerald'}-400 border border-${(user.role || user.funcao) === 'admin' ? 'blue' : 'emerald'}-500/20 uppercase tracking-wide">
          ${(user.role || user.funcao) === 'admin' ? 'Admin' : 'Operador'}
        </span>
      </td>
      <td class="py-3 px-6 text-slate-400">
        <div class="flex items-center gap-2">
          <i class="ph ph-calendar-blank text-lg"></i>
          <span>${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </td>
      <td class="py-3 px-6 text-slate-400 font-mono tracking-[0.2em]">••••••••</td>
      <td class="py-3 px-6 text-right">
        <div class="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button class="btn-edit-user p-1.5 hover:bg-vectra-light/20 hover:text-vectra-light rounded-lg transition-colors" title="Editar" data-user-id="${user.id}">
            <i class="ph ph-pencil-simple text-[1.1rem]"></i>
          </button>
          <button class="btn-delete-user p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Excluir" data-user-id="${user.id}">
            <i class="ph ph-trash text-[1.1rem]"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  bindEvents();
}

function openNewUserModal() {
  currentEditingUser = null;
  document.getElementById('nomeUser').value = '';
  document.getElementById('emailUser').value = '';
  document.getElementById('funcaoUser').value = 'operador';
  document.getElementById('senhaUser').value = '';
  document.getElementById('addUserModal').classList.remove('hidden', 'opacity-0', 'scale-95');
  document.getElementById('addUserModal').classList.add('opacity-100', 'scale-100');
}


function closeAllModals() {
  // Só modais
  document.querySelectorAll('#addUserModal, #editUserModal, #deleteUserModal').forEach(modal => {
    modal.classList.add('hidden', 'opacity-0', 'scale-95');
    modal.classList.remove('opacity-100', 'scale-100');
  });
  
  // Garantir botão Novo Usuário sempre visível
  const btnOpen = document.getElementById('btnOpenModal');
  if (btnOpen) {
    btnOpen.classList.remove('hidden', 'opacity-0', 'scale-95');
    btnOpen.classList.add('opacity-100');
  }
}


async function saveNewUser(e) {
  e.preventDefault();
  const nome = document.getElementById('nomeUser').value.trim();
  const email = document.getElementById('emailUser').value.trim();
  const funcao = document.getElementById('funcaoUser').value;
  const senha = document.getElementById('senhaUser').value;

  if (!nome || !email || !senha) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_completo: nome, email, funcao, senha })
    });
    if (!response.ok) throw new Error('Falha ao criar usuário');
    loadUsers();
    closeAllModals();
  } catch (error) {
    console.error(error);
    alert('Erro ao criar usuário');
  }
}

function openEditUserModal(e) {
  const userId = e.target.closest('[data-user-id]')?.dataset.userId || e.currentTarget.dataset.userId;
  currentEditingUser = users.find(u => u.id == userId);
  if (!currentEditingUser) return;

  document.getElementById('editNomeUser').value = currentEditingUser.name || currentEditingUser.nome_completo || currentEditingUser.nome;
  document.getElementById('editEmailUser').value = currentEditingUser.email;
  document.getElementById('editFuncaoUser').value = currentEditingUser.role || currentEditingUser.funcao;

  document.getElementById('editUserModal').classList.remove('hidden', 'opacity-0', 'scale-95');
  document.getElementById('editUserModal').classList.add('opacity-100', 'scale-100');
}

async function updateUser(e) {
  e.preventDefault();
  if (!currentEditingUser) return;

  const nome = document.getElementById('editNomeUser').value.trim();
  const funcao = document.getElementById('editFuncaoUser').value;
  const senha = document.getElementById('editSenhaUser')?.value || null; // Optional

  try {
    const response = await fetch(`/api/users/${currentEditingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_completo: nome, funcao, senha })
    });
    if (!response.ok) throw new Error('Falha ao atualizar');
    loadUsers();
    closeAllModals();
  } catch (error) {
    console.error(error);
    alert('Erro ao atualizar usuário');
  }
}

function openDeleteUserModal(e) {
  const userId = e.target.closest('[data-user-id]')?.dataset.userId || e.currentTarget.dataset.userId;
  userToDelete = users.find(u => u.id == userId);
  if (userToDelete) {
    document.querySelector('#deleteUserModal p').innerHTML = 
      `Tem certeza que deseja excluir <span class="text-white font-medium">${userToDelete.name || userToDelete.nome_completo || userToDelete.nome}</span>? Esta ação não pode ser desfeita.`;
  }

  document.getElementById('deleteUserModal').classList.remove('hidden', 'opacity-0', 'scale-95');
  document.getElementById('deleteUserModal').classList.add('opacity-100', 'scale-100');
}

async function confirmDeleteUser() {
  if (!userToDelete) return;

  try {
    const response = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Falha ao deletar');
    loadUsers();
    closeAllModals();
  } catch (error) {
    console.error(error);
    alert('Erro ao deletar usuário');
  }
}

