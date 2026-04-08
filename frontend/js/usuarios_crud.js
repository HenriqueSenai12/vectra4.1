// CRUD completo + Toast fix
function openModal(modalId, contentId) {
  const modal = document.getElementById(modalId);
  const content = document.getElementById(contentId);
  if(!modal || !content) return;
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
  }, 10);
}

function closeModal(modalId, contentId) {
  const modal = document.getElementById(modalId);
  const content = document.getElementById(contentId);
  if(!modal || !content) return;
  modal.classList.add('opacity-0');
  content.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('#vectra-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'vectra-toast';
  toast.className = `fixed bottom-4 left-4 z-[1000] p-4 rounded-xl shadow-2xl border transform translate-x-0 transition-all duration-300 bg-[${type === 'success' ? '#10b981' : '#ef4444'}]/20 backdrop-blur-md border-${type === 'success' ? 'emerald' : 'red'}-500/30 text-white max-w-sm font-medium flex items-center gap-3`;
  toast.innerHTML = `
    <i class="ph ph-check-circle text-xl ${type === 'success' ? 'text-emerald-400' : 'text-red-400'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('-translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const userTableBody = document.querySelector('tbody');
  const addForm = document.querySelector('#addUserModal form');
  const editForm = document.querySelector('#editUserModal form');
  const searchInput = document.querySelector('input[placeholder*="Buscar"]');
  const btnOpenAdd = document.getElementById('btnOpenModal');

  let users = [];
  let editingUserId = null;

  // Load users
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      users = await response.json();
      renderTable(users);
    } catch (err) {
      console.error('Load users error:', err);
      showToast('Erro carregar usuários', 'error');
    }
  };

  const renderTable = (data = users) => {
    userTableBody.innerHTML = data.map(user => `
      <tr class="hover:bg-white/5 transition-all duration-200 group">
        <td class="py-3 px-6">
          <div class="flex items-center gap-3">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1E3A5F&color=fff" class="w-8 h-8 rounded-full border border-white/10">
            <span class="font-medium text-white group-hover:text-vectra-light">${user.name}</span>
          </div>
        </td>
        <td class="py-3 px-6 text-slate-300">${user.email}</td>
        <td class="py-3 px-6">
          <span class="px-2.5 py-1 text-[11px] font-medium rounded-full bg-${user.role === 'admin' ? 'blue' : 'emerald'}-500/20 text-${user.role === 'admin' ? 'blue' : 'emerald'}-400 border border-${user.role === 'admin' ? 'blue' : 'emerald'}-500/20 uppercase tracking-wide">
            ${user.role}
          </span>
        </td>
        <td class="py-3 px-6 text-slate-400">
          <div class="flex items-center gap-2">
            <i class="ph ph-calendar-blank text-lg"></i>
            <span>${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </td>
        <td class="py-3 px-6 text-slate-400 font-mono tracking-[0.2em]">••••••••</td>
        <td class="py-3 px-6 text-right">
          <div class="flex gap-1">
            <button class="btn-edit-user p-1.5 hover:bg-vectra-light/20 hover:text-vectra-light rounded-lg" data-id="${user.id}" title="Editar">
              <i class="ph ph-pencil-simple text-[1.1rem]"></i>
            </button>
            <button class="btn-delete-user p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg" data-id="${user.id}" title="Excluir">
              <i class="ph ph-trash text-[1.1rem]"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const createUser = async (formData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await loadUsers();
        closeModal('addUserModal', 'modalContent');
        showToast('Usuário criado!');
      } else {
        showToast('Erro servidor', 'error');
      }
    } catch (err) {
      showToast('Erro conexão', 'error');
    }
  };

  const updateUser = async (id, formData) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await loadUsers();
        closeModal('editUserModal', 'editModalContent');
        showToast('Usuário atualizado!');
      } else {
        showToast('Erro servidor', 'error');
      }
    } catch (err) {
      showToast('Erro conexão', 'error');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Confirma exclusão?')) return;
    try {
      const response = await fetch(`/backend/users/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadUsers();
        showToast('Usuário excluído!');
      } else {
        showToast('Erro servidor', 'error');
      }
    } catch (err) {
      showToast('Erro conexão', 'error');
    }
  };

  // Event listeners
  if (addForm) {
    addForm.onsubmit = (e) => {
      e.preventDefault();
      const formData = {
        nome_completo: addForm.querySelector('input[placeholder*="João"]').value,
        email: addForm.querySelector('input[type="email"]').value,
        funcao: addForm.querySelector('select').value,
        senha: addForm.querySelector('input[type="password"]').value
      };
      createUser(formData);
    };
  }

  if (btnOpenAdd) {
    btnOpenAdd.onclick = () => openModal('addUserModal', 'modalContent');
  }

  document.onclick = (e) => {
    const editBtn = e.target.closest('.btn-edit-user');
    if (editBtn) {
      editingUserId = editBtn.dataset.id;
      const user = users.find(u => u.id == editingUserId);
      if (user) {
        editForm.querySelector('input[type="text"]').value = user.name;
        editForm.querySelector('select').value = user.role;
        openModal('editUserModal', 'editModalContent');
      }
    }

    const deleteBtn = e.target.closest('.btn-delete-user');
    if (deleteBtn) {
      deleteUser(deleteBtn.dataset.id);
    }

    const closeBtns = e.target.closest('.close-edit-modal, .close-delete-modal, #btnCloseModal, #btnCancelModal');
    if (closeBtns) {
      const modalId = closeBtns.classList.contains('close-edit-modal') ? 'editUserModal' : closeBtns.id.includes('Close') ? 'addUserModal' : 'deleteUserModal';
      const contentId = modalId === 'addUserModal' ? 'modalContent' : modalId === 'editUserModal' ? 'editModalContent' : 'deleteModalContent';
      closeModal(modalId, contentId);
    }
  };

  if (editForm) {
    editForm.onsubmit = (e) => {
      e.preventDefault();
      const formData = {
        nome_completo: editForm.querySelector('input[type="text"]').value,
        funcao: editForm.querySelector('select').value,
        senha: editForm.querySelector('input[type="password"]').value || null
      };
      updateUser(editingUserId, formData);
    };
  }

  if (searchInput) {
    searchInput.oninput = (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
      renderTable(filtered);
    };
  }

  // Close modals clicking outside
  ['addUserModal', 'editUserModal', 'deleteUserModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) {
          const contentId = id === 'addUserModal' ? 'modalContent' : id === 'editUserModal' ? 'editModalContent' : 'deleteModalContent';
          closeModal(id, contentId);
        }
      };
    }
  });

  // Initial load
  await loadUsers();
});
