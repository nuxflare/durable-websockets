<template>
  <div class="min-h-screen py-4">
    <!-- User Info Modal -->
    <UModal
      title="Welcome to Chat"
      description="Enter details to join chat."
      v-model:open="showUserModal"
      :dismissible="false"
      :close="false"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Name">
            <UInput
              v-model="userNameInput"
              placeholder="Enter your name"
              class="w-full"
              autofocus
          /></UFormField>
          <UFormField label="Room Name"
            ><UInput
              v-model="chatRoomInput"
              placeholder="Enter chat room name"
              class="w-full"
          /></UFormField>
        </div>
      </template>
      <template #footer>
        <UButton
          color="primary"
          block
          :disabled="!userNameInput.trim() || !chatRoomInput.trim()"
          @click="joinChatRoom"
        >
          Join Chat
        </UButton>
      </template>
    </UModal>

    <UContainer class="h-[90vh]">
      <UCard
        :ui="{ body: 'flex-1 overflow-y-auto py-4' }"
        class="h-full flex flex-col"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold">Chat</h1>
            <div v-if="chatRoom" class="text-sm text-gray-500">
              Room: {{ chatRoom }}
            </div>
          </div>
        </template>

        <!-- Messages Container -->
        <Messages
          v-if="chatRoom && currentUser.id"
          :chatRoom="chatRoom"
          :currentUser="currentUser"
          ref="messagesComponent"
        />

        <template #footer>
          <div class="relative">
            <UTextarea
              v-model="newMessage"
              placeholder="Type your message..."
              :ui="{ base: 'min-h-30' }"
              class="w-full"
              :rows="2"
              @keydown.enter.prevent="handleTextareaEnter"
              autofocus
            />
            <UButton
              @click="sendMessage"
              :disabled="!newMessage.trim()"
              icon="i-heroicons-paper-airplane"
              class="absolute right-2 bottom-2"
              variant="solid"
              size="sm"
            />
          </div>
        </template>
      </UCard>
    </UContainer>
  </div>
</template>

<script setup>
// Chat modal state
const showUserModal = ref(true);
const userNameInput = ref("");
const chatRoomInput = ref("");
const chatRoom = ref("");

// Current user (you)
const currentUser = ref({
  id: "",
  name: "",
});

// Chat messages
const messagesComponent = ref(null);

// Function to join the chat room
function joinChatRoom() {
  if (userNameInput.value.trim() && chatRoomInput.value.trim()) {
    currentUser.value = {
      id: `user-${Math.random().toString(36).substring(2, 9)}`,
      name: userNameInput.value.trim(),
    };
    chatRoom.value = chatRoomInput.value.trim();
    showUserModal.value = false;
  }
}

const newMessage = ref("");
const messagesContainer = ref(null);

// Handle textarea enter key
function handleTextareaEnter(e) {
  if (!e.shiftKey) {
    sendMessage();
  } else {
    // Insert newline at cursor position
    const cursorPos = e.target.selectionStart;
    newMessage.value =
      newMessage.value.substring(0, cursorPos) +
      "\n" +
      newMessage.value.substring(cursorPos);
    // Move cursor to after the newline
    nextTick(() => {
      e.target.selectionStart = e.target.selectionEnd = cursorPos + 1;
    });
  }
}

function sendMessage() {
  if (newMessage.value.trim() && messagesComponent.value) {
    messagesComponent.value.handleSend(newMessage.value.trim());
    newMessage.value = "";
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

onMounted(() => {
  scrollToBottom();
});
</script>
