/**
 * Human-to-Human Direct Messaging Page
 * STRICT: Absolutely NO AI chatbot. Pure authenticated peer-to-peer messaging.
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';

export async function renderChatPage() {
  return `
    <div style="display: flex; flex-direction: column; height: calc(100vh - 120px);">
      <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Direct Human-to-Human Messaging</h1>
          <p style="color: var(--text-muted); font-size: 13px;">Secure, private communication with verified alumni, mentors, faculty, and peers.</p>
        </div>
      </div>

      <div class="glass-card" style="flex: 1; padding: 0; display: flex; overflow: hidden; min-height: 500px; border: var(--glass-border);">
        <!-- Left: Conversations List -->
        <div style="width: 320px; border-right: var(--glass-border); display: flex; flex-direction: column; background: var(--bg-card);">
          <div style="padding: 14px 16px; border-bottom: var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle);">
            <span style="font-weight: 700; color: var(--text-heading); font-size: 15px;">Conversations</span>
            <button type="button" id="start-new-chat-btn" class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 12px;">
              + New Chat
            </button>
          </div>
          <div id="chat-conv-list" style="flex: 1; overflow-y: auto;">
            <div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 13px;">
              Loading conversations...
            </div>
          </div>
        </div>

        <!-- Right: Message History & Input -->
        <div style="flex: 1; display: flex; flex-direction: column; background: var(--bg-subtle);">
          <!-- Chat Header -->
          <div id="active-chat-header" style="height: 60px; border-bottom: var(--glass-border); background: var(--bg-card); padding: 0 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="color: var(--text-muted); font-size: 14px;">Select a conversation to begin chatting</div>
          </div>

          <!-- Messages Stream -->
          <div id="chat-messages-container" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <div class="empty-state" style="margin: auto; text-align: center;">
              <div class="empty-state-icon">💬</div>
              <div class="empty-state-title">No conversation selected</div>
              <p style="color: var(--text-muted); margin-bottom: 14px;">Select an ongoing discussion on the left or start a new chat.</p>
              <button type="button" class="btn btn-primary btn-sm" id="empty-new-chat-btn">Find Alumni to Chat ➔</button>
            </div>
          </div>

          <!-- Input Bar -->
          <div style="border-top: var(--glass-border); background: var(--bg-card); padding: 14px 20px;">
            <form id="chat-send-form" style="display: flex; gap: 10px;">
              <input type="text" id="chat-message-input" class="form-control" placeholder="Select a conversation to start typing..." disabled autocomplete="off">
              <button type="submit" id="chat-send-btn" class="btn btn-primary" disabled style="padding: 10px 22px; white-space: nowrap;">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initChatPage() {
  const convList = document.getElementById('chat-conv-list');
  const chatHeader = document.getElementById('active-chat-header');
  const messagesContainer = document.getElementById('chat-messages-container');
  const sendForm = document.getElementById('chat-send-form');
  const msgInput = document.getElementById('chat-message-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const newChatBtn = document.getElementById('start-new-chat-btn');
  const emptyNewChatBtn = document.getElementById('empty-new-chat-btn');

  const currentUid = authState.user?.uid || authState.user?.id;
  let activeConvId = null;
  let activePartnerName = '';
  let activePartnerRole = '';
  let pollTimer = null;
  let lastMessageCount = 0;

  // Cleanup polling on navigate
  const cleanup = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
  window.addEventListener('hashchange', cleanup, { once: true });

  const loadConversations = async (autoSelectFirst = true) => {
    try {
      const res = await api.getConversations();
      const conversations = res.data || [];

      if (conversations.length === 0) {
        convList.innerHTML = `
          <div style="padding: 24px 16px; text-align: center; color: var(--slate-500); font-size: 13px;">
            <div style="font-size: 24px; margin-bottom: 8px;">📬</div>
            <div style="font-weight: 700; color: var(--navy-900); margin-bottom: 4px;">No conversations yet</div>
            <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Start a private message with verified alumni or mentors.</p>
            <button type="button" class="btn btn-outline btn-sm prompt-new-chat-btn" style="width: 100%;">
              + Start New Chat
            </button>
          </div>
        `;
        document.querySelectorAll('.prompt-new-chat-btn').forEach(b => b.addEventListener('click', openNewChatModal));
        return;
      }

      convList.innerHTML = conversations.map(c => {
        const partnerUid = c.participants.find(p => p !== currentUid) || currentUid;
        const partnerName = c.participantNames?.[partnerUid] || 'Alumni Member';
        const partnerRole = c.participantRoles?.[partnerUid] || 'alumni';
        const isSelected = c.id === activeConvId;

        return `
          <div class="conv-item" data-id="${c.id}" data-partner="${escapeHtml(partnerName)}" data-role="${partnerRole}" style="padding: 14px 16px; border-bottom: var(--glass-border); cursor: pointer; background: ${isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent'}; border-left: ${isSelected ? '4px solid var(--neon-amber)' : '4px solid transparent'}; transition: all var(--transition-fast);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <div style="font-weight: 700; font-size: 14px; color: var(--text-heading);">${escapeHtml(partnerName)}</div>
              <span class="user-role-badge role-${partnerRole}" style="font-size: 9px;">${partnerRole}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(c.lastMessage || 'New conversation started')}
            </div>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', () => {
          const cid = item.getAttribute('data-id');
          const pname = item.getAttribute('data-partner');
          const prole = item.getAttribute('data-role');
          selectConversation(cid, pname, prole);
        });
      });

      // Check query param ?recipientId= or ?userId= or ?conv=
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const paramRecipientId = urlParams.get('recipientId') || urlParams.get('userId');
      const paramConvId = urlParams.get('conv');

      if (paramRecipientId) {
        try {
          const convRes = await api.startConversation(paramRecipientId);
          const newConv = convRes.data;
          if (newConv && newConv.id) {
            const partnerUid = newConv.participants.find(p => p !== currentUid) || currentUid;
            const pName = newConv.participantNames?.[partnerUid] || 'Alumni Member';
            const pRole = newConv.participantRoles?.[partnerUid] || 'alumni';
            await selectConversation(newConv.id, pName, pRole);
            return;
          }
        } catch (err) {
          console.warn('Could not auto-start conversation for recipientId:', err);
        }
      }

      if (paramConvId && (!activeConvId || activeConvId !== paramConvId)) {
        const match = conversations.find(c => c.id === paramConvId);
        if (match) {
          const partnerUid = match.participants.find(p => p !== currentUid) || currentUid;
          await selectConversation(match.id, match.participantNames?.[partnerUid] || 'Peer', match.participantRoles?.[partnerUid] || 'alumni');
          return;
        }
      }

      // If active conversation is already set, highlight it
      if (activeConvId) {
        highlightActiveItem(activeConvId);
      } else if (autoSelectFirst && conversations.length > 0) {
        // Auto-select first conversation so user can immediately type!
        const first = conversations[0];
        const partnerUid = first.participants.find(p => p !== currentUid) || currentUid;
        await selectConversation(first.id, first.participantNames?.[partnerUid] || 'Peer', first.participantRoles?.[partnerUid] || 'alumni');
      }

    } catch (e) {
      console.error('Failed to load conversations:', e);
      convList.innerHTML = `
        <div style="padding: 16px; color: var(--color-danger); font-size: 13px;">
          <div style="font-weight: 700; margin-bottom: 4px;">Failed to load conversations</div>
          <p style="font-size: 11px; color: var(--slate-600); margin-bottom: 8px;">${escapeHtml(e.message || 'Error communicating with backend API.')}</p>
          <button type="button" class="btn btn-outline btn-sm" id="retry-convs-btn" style="font-size: 11px; padding: 4px 8px;">↻ Retry</button>
        </div>
      `;
      document.getElementById('retry-convs-btn')?.addEventListener('click', () => loadConversations(true));
    }
  };

  const highlightActiveItem = (convId) => {
    document.querySelectorAll('.conv-item').forEach(item => {
      const isSel = item.getAttribute('data-id') === convId;
      item.style.background = isSel ? 'var(--teal-50)' : 'transparent';
      item.style.borderLeft = isSel ? '4px solid var(--teal-600)' : '4px solid transparent';
    });
  };

  const selectConversation = async (convId, partnerName, partnerRole) => {
    activeConvId = convId;
    activePartnerName = partnerName;
    activePartnerRole = partnerRole;

    highlightActiveItem(convId);

    chatHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 38px; height: 38px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--neon-amber), var(--neon-violet)); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">
          ${(partnerName || 'U').substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div style="font-weight: 700; color: var(--text-heading); font-size: 15px;">${escapeHtml(partnerName)}</div>
          <span class="user-role-badge role-${partnerRole}">${partnerRole}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="badge badge-amber">● Active Secure Channel</span>
      </div>
    `;

    // Enable composer input
    msgInput.disabled = false;
    msgInput.placeholder = `Type a message to ${partnerName}... (Press Enter to send)`;
    sendBtn.disabled = false;
    msgInput.focus();

    await loadMessages(convId, false);
    startPolling();
  };

  const loadMessages = async (convId, isPolling = false) => {
    if (!convId) return;
    try {
      const res = await api.getMessages(convId);
      const messages = res.data || [];

      // Avoid unnecessary DOM re-renders during polling if message count hasn't changed
      if (isPolling && messages.length === lastMessageCount) {
        return;
      }
      lastMessageCount = messages.length;

      if (messages.length === 0) {
        messagesContainer.innerHTML = `
          <div class="empty-state" style="margin: auto; text-align: center;">
            <div style="font-size: 28px; margin-bottom: 8px;">👋</div>
            <div style="font-weight: 700; color: var(--text-heading); font-size: 15px;">Start of conversation</div>
            <p style="color: var(--text-muted); font-size: 13px;">Say hello to ${escapeHtml(activePartnerName)} to begin collaborating!</p>
          </div>
        `;
        return;
      }

      messagesContainer.innerHTML = messages.map(m => {
        const isMe = (m.senderId === currentUid || m.sender_id === currentUid);
        const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        return `
          <div style="display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'};">
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 2px;">
              ${escapeHtml(m.senderName || (isMe ? 'You' : activePartnerName))} ${timeStr ? `• ${timeStr}` : ''}
            </div>
            <div style="max-width: 70%; padding: 10px 16px; border-radius: var(--radius-md); font-size: 14px; line-height: 1.5; word-break: break-word; ${
              isMe
                ? 'background: linear-gradient(135deg, var(--neon-amber) 0%, var(--neon-violet) 100%); color: #ffffff; border-bottom-right-radius: 2px; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.25);'
                : 'background: var(--bg-card); color: var(--text-heading); border: var(--glass-border); border-bottom-left-radius: 2px; box-shadow: var(--shadow-sm);'
            }">
              ${escapeHtml(m.text)}
            </div>
          </div>
        `;
      }).join('');

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (e) {
      if (!isPolling) {
        console.error('Failed to load messages:', e);
        messagesContainer.innerHTML = `
          <div style="color: var(--color-danger); padding: 20px;">
            <div style="font-weight: 700; margin-bottom: 4px;">Failed to load messages</div>
            <p style="font-size: 12px; color: var(--slate-600);">${escapeHtml(e.message || 'Error communicating with backend API.')}</p>
          </div>
        `;
      }
    }
  };

  const startPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (activeConvId && document.getElementById('chat-messages-container')) {
        loadMessages(activeConvId, true);
      } else {
        cleanup();
      }
    }, 3000);
  };

  // Keyboard shortcut: Enter to send
  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendForm.requestSubmit ? sendForm.requestSubmit() : sendForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  if (sendForm) {
    sendForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = msgInput.value.trim();
      if (!text || !activeConvId) return;

      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';

      try {
        await api.sendMessage(activeConvId, text);
        // Clear input only on success
        msgInput.value = '';
        await loadMessages(activeConvId, false);
        // Refresh conversation preview in list
        loadConversations(false);
      } catch (err) {
        showToast(err.message || 'Failed to send message. Please try again.', 'error');
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        msgInput.focus();
      }
    });
  }

  // New Chat Modal to pick a recipient directly
  const openNewChatModal = async () => {
    try {
      const res = await api.searchAlumni();
      const users = res.data || [];
      const eligibleUsers = users.filter(u => (u.uid || u.id) !== currentUid);

      const content = `
        <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 12px;">
          Choose an alumni member or student to start a 1-on-1 private conversation:
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 350px; overflow-y: auto;">
          ${eligibleUsers.length === 0 ? `
            <div class="empty-state"><p>No other active members found.</p></div>
          ` : eligibleUsers.map(u => `
            <div style="border: 1px solid var(--border-color); padding: 10px 14px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--teal-600); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">
                  ${(u.displayName || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 14px; color: var(--navy-900);">${escapeHtml(u.displayName || 'Alumni')}</div>
                  <div style="font-size: 12px; color: var(--slate-500);">${escapeHtml(u.email || '')} ${u.company ? `• ${escapeHtml(u.company)}` : ''}</div>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-sm direct-chat-pick-btn" data-uid="${u.uid || u.id}" data-name="${escapeHtml(u.displayName || 'Alumni')}" data-role="${u.role || 'alumni'}">
                Chat ➔
              </button>
            </div>
          `).join('')}
        </div>
      `;

      const { close } = openModal({ title: 'Start a New Conversation', contentHtml: content });

      document.querySelectorAll('.direct-chat-pick-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const targetUid = btn.getAttribute('data-uid');
          const targetName = btn.getAttribute('data-name');
          const targetRole = btn.getAttribute('data-role');
          btn.disabled = true;
          btn.textContent = 'Opening...';

          try {
            const convRes = await api.startConversation(targetUid);
            const conv = convRes.data;
            close();
            await loadConversations(false);
            if (conv && conv.id) {
              selectConversation(conv.id, targetName, targetRole);
            }
          } catch (err) {
            showToast(err.message || 'Could not start conversation.', 'error');
            btn.disabled = false;
            btn.textContent = 'Chat ➔';
          }
        });
      });

    } catch (err) {
      showToast('Could not load directory members.', 'error');
    }
  };

  if (newChatBtn) newChatBtn.addEventListener('click', openNewChatModal);
  if (emptyNewChatBtn) emptyNewChatBtn.addEventListener('click', openNewChatModal);

  // Initial load
  loadConversations(true);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
