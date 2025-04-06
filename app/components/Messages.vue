<template>
  <div class="space-y-2" ref="messagesContainer">
    <div
      v-for="(message, index) in messages"
      :key="index"
      class="flex"
      :class="
        message.sender.id === currentUser.id ? 'justify-end' : 'justify-start'
      "
    >
      <div
        class="max-w-[80%] rounded-lg p-4"
        :class="[
          message.sender.id === currentUser.id
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700',
        ]"
      >
        <div class="flex justify-between items-center mb-1.5">
          <span
            class="font-semibold text-sm"
            :class="
              message.sender.id === currentUser.id
                ? 'text-white'
                : 'text-gray-800 dark:text-gray-200'
            "
          >
            {{ message.sender.name }}
          </span>
          <span
            class="text-xs ml-4"
            :class="
              message.sender.id === currentUser.id
                ? 'text-white/80'
                : 'text-gray-500 dark:text-gray-400'
            "
          >
            {{ formatTime(message.timestamp) }}
          </span>
        </div>
        <p class="text-base leading-relaxed whitespace-pre-wrap">
          {{ message.content }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWebSocket } from "@vueuse/core";

type Message = {
  sender: {
    id: string;
    name: string;
  };
  content: string;
  timestamp: string;
};

const messages = ref<Message[]>([]);
const { chatRoom, currentUser } = defineProps({
  chatRoom: {
    type: String,
    required: true,
  },
  currentUser: {
    type: Object,
    required: true,
  },
});

const protocol = btoa(`${chatRoom}:${currentUser.id}`);
const { send } = useWebSocket(useRuntimeConfig().public.websocketsUrl, {
  protocols: [protocol.replaceAll("=", ""), "chat"],
  onConnected: () => {
    send(
      JSON.stringify({
        type: "name",
        name: currentUser.name,
      }),
    );
  },
  onMessage: (_ws, event) => {
    const data = JSON.parse(event.data);
    if (data.type === "chat") {
      messages.value.push({
        sender: {
          id: data.userId,
          name: data.userName,
        },
        content: data.text,
        timestamp: data.time,
      });
    }
  },
});

function formatTime(date: string) {
  return new Intl.DateTimeFormat("default", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(date));
}

function handleSend(content: string) {
  send(
    JSON.stringify({
      type: "chat",
      text: content,
    }),
  );
}

defineExpose({
  handleSend,
});
</script>
