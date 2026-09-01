import { browser } from '$app/environment';

export function createUiStore() {
  let isSidebarOpen = $state(false);
  let isDarkMode = $state(false);
  let isAuthModalOpen = $state(false);
  let isProfileModalOpen = $state(false);
  let isAdminModalOpen = $state(false);

  if (browser) {
    // Restore Dark Mode
    const savedDark = localStorage.getItem('rsud_chat_dark');
    if (savedDark === 'true' || (!savedDark && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      isDarkMode = true;
      document.documentElement.classList.add('dark');
    } else {
      isDarkMode = false;
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if (browser) {
      localStorage.setItem('rsud_chat_dark', String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function setSidebar(open: boolean) {
    isSidebarOpen = open;
  }

  function openAuthModal() {
    isSidebarOpen = false;
    isAuthModalOpen = true;
  }

  function openProfileModal() {
    isSidebarOpen = false;
    isProfileModalOpen = true;
  }

  function openAdminModal() {
    isSidebarOpen = false;
    isAdminModalOpen = true;
  }

  return {
    get isSidebarOpen() {
      return isSidebarOpen;
    },
    set isSidebarOpen(val: boolean) {
      isSidebarOpen = val;
    },
    get isDarkMode() {
      return isDarkMode;
    },
    get isAuthModalOpen() {
      return isAuthModalOpen;
    },
    set isAuthModalOpen(val: boolean) {
      isAuthModalOpen = val;
    },
    get isProfileModalOpen() {
      return isProfileModalOpen;
    },
    set isProfileModalOpen(val: boolean) {
      isProfileModalOpen = val;
    },
    get isAdminModalOpen() {
      return isAdminModalOpen;
    },
    set isAdminModalOpen(val: boolean) {
      isAdminModalOpen = val;
    },
    toggleDarkMode,
    toggleSidebar,
    setSidebar,
    openAuthModal,
    openProfileModal,
    openAdminModal
  };
}

export const uiStore = createUiStore();
