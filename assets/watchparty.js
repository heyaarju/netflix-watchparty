// Main watch party script
document.addEventListener('DOMContentLoaded', () => {
  // State vars
  let currentPartyId = null;
  let currentUser = null;
  let isHost = false;
  let partyRef = null;
  let participantsRef = null;
  let messagesRef = null;
  let videoStateRef = null;
  let videoSyncInterval = null;
  
  console.log("Watch Party script loaded");
  
  // Listen for join event
  document.addEventListener('watchPartyJoin', (e) => {
    console.log("watchPartyJoin event received:", e.detail);
    if (e.detail && e.detail.partyCode) {
      joinParty(e.detail.partyCode);
    }
  });
  
  // Make random username
  function generateUserName() {
    const names = [
      "Arjun", "Vikram", "Rahul", "Kiran", "Priya", 
      "Neha", "Ravi", "Ananya", "Aditya", "Meera",
      "Rohan", "Divya", "Amit", "Nisha", "Raj"
    ];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${randomName}${randomNumber}`;
  }
  
  // Make unique party ID
  function generatePartyId() {
    return Math.random().toString(36).substring(2, 10);
  }
  
  // Setup user
  function initUser() {
    // Check local storage first
    const storedUser = localStorage.getItem('watchparty_user');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
    } else {
      // Create new user
      currentUser = {
        id: 'user_' + Date.now(),
        name: generateUserName(),
        avatar: 'U'
      };
      localStorage.setItem('watchparty_user', JSON.stringify(currentUser));
    }
    
    console.log("Current user:", currentUser);
    return currentUser;
  }
  
  // Set up buttons
  initWatchPartyButtons();
  
  // Custom event listener
  document.addEventListener('openWatchParty', (e) => {
    console.log("openWatchParty event received:", e.detail);
    if (e.detail && e.detail.title) {
      openWatchPartyModal(e.detail.title, e.detail.image);
    }
  });

  function initWatchPartyButtons() {
    // Init user first
    initUser();
    
    // Setup watchparty page
    if (window.location.pathname.includes('watchparty.html')) {
      console.log("Setting up Watch Party page listeners");
      setupWatchPartyPageListeners();
    }
  }
  
  // Start new party
  function startNewParty(movieTitle, posterSrc) {
    isHost = true;
    const partyId = generatePartyId();
    currentPartyId = partyId;
    
    console.log("Creating new party with ID:", partyId);
    
    // Create party in Firebase
    partyRef = database.ref(`parties/${partyId}`);
    
    // Setup refs
    participantsRef = database.ref(`parties/${partyId}/participants`);
    messagesRef = database.ref(`parties/${partyId}/messages`);
    videoStateRef = database.ref(`parties/${partyId}/videoState`);
    
    // Create party data
    const completePartyData = {
      id: partyId,
      title: movieTitle,
      poster: posterSrc,
      hostId: currentUser.id,
      hostName: currentUser.name,
      status: 'active',
      videoSrc: './assets/video/video_watchparty.mp4',
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      participants: {
        [currentUser.id]: {
          id: currentUser.id,
          name: currentUser.name,
          isHost: true,
          joinedAt: firebase.database.ServerValue.TIMESTAMP
        }
      },
      videoState: {
        isPlaying: false,
        currentTime: 0,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        updatedBy: currentUser.id,
        updatedByName: currentUser.name
      }
    };
    
    // Save to Firebase
    partyRef.set(completePartyData).then(() => {
      console.log("Party created successfully with complete initialization");
      
      // Add welcome msg
      sendSystemMessage(`Party created by ${currentUser.name}. Share the code to invite friends!`);
      
      // Open modal
      openWatchPartyModal(movieTitle, posterSrc, partyId);
    }).catch(error => {
      console.error("Error creating party: ", error);
      alert("Failed to create party. Please try again. Error: " + error.message);
    });
  }
  
  // Join party
  function joinParty(partyId) {
    currentPartyId = partyId;
    isHost = false;
    
    console.log("*** JOINING PARTY ATTEMPT ***");
    console.log("Party ID:", partyId);
    console.log("Current user:", currentUser);
    console.log("************************");
    
    if (!partyId || partyId.trim() === "") {
      console.error("Join failed: Empty party code");
      alert("Please enter a valid party code");
      return;
    }
    
    // Get ref
    partyRef = database.ref(`parties/${partyId}`);
    
    // Check if exists
    partyRef.once('value')
      .then(snapshot => {
        console.log("Party data snapshot:", snapshot.val());
        if (snapshot.exists()) {
          const partyData = snapshot.val();
          console.log("*** PARTY JOIN SUCCESS ***");
          console.log("Found party:", partyData.title);
          console.log("************************");
          
          // Set up references
          participantsRef = database.ref(`parties/${partyId}/participants`);
          
          // Check if user is already in the party
          participantsRef.child(currentUser.id).once('value').then(userSnapshot => {
            if (!userSnapshot.exists()) {
              // Add user to party
              participantsRef.child(currentUser.id).set({
                id: currentUser.id,
                name: currentUser.name,
                isHost: false,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
              });
            }
          });
          
          // Setup message refs
          messagesRef = database.ref(`parties/${partyId}/messages`);
          
          // Setup video state ref
          videoStateRef = database.ref(`parties/${partyId}/videoState`);
          
          // Create videoState if missing
          videoStateRef.once('value').then(videoStateSnapshot => {
            if (!videoStateSnapshot.exists()) {
              console.log("Video state doesn't exist, creating it");
              videoStateRef.set({
                isPlaying: false,
                currentTime: 0,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                updatedBy: currentUser.id,
                updatedByName: currentUser.name
              });
            }
          });
          
          console.log("Successfully joined party");
          
          // Open party UI
          openWatchPartyModal(partyData.title, partyData.poster, partyId);
        } else {
          console.error("*** PARTY JOIN FAILED ***");
          console.error("Party not found:", partyId);
          console.error("************************");
          alert("Party not found! Please check the code and try again.");
        }
      })
      .catch(error => {
        console.error("*** PARTY JOIN ERROR ***");
        console.error("Error joining party: ", error);
        console.error("************************");
        alert("Failed to join party. Please try again. Error: " + error.message);
      });
  }

  function openWatchPartyModal(movieTitle, posterSrc, partyId = null) {
    // Generate ID if needed
    if (!partyId) {
      partyId = currentPartyId || generatePartyId();
      currentPartyId = partyId;
    }
    
    console.log("Opening watch party modal for party:", partyId, "with title:", movieTitle);
    
    // Don't create duplicates
    const existingModal = document.querySelector(`.watch-party-modal[data-party-id="${partyId}"]`);
    if (existingModal) {
      console.log("Modal already exists for this party, focusing it instead of creating a new one");
      existingModal.style.display = 'block';
      return;
    }
    
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'watch-party-modal';
    modal.setAttribute('data-party-id', partyId);
    modal.innerHTML = `
      <div class="watch-party-modal-content">
        <div class="modal-header">
          <h2 class="text-xl mb-3">Watch Party: ${movieTitle || 'Movie'}</h2>
          <div class="modal-controls">
            <span class="maximize-modal">⛶</span>
            <span class="close-modal">&times;</span>
          </div>
        </div>
        <p class="text-sm text-gray-400 mb-3">Party ID: <span class="font-bold party-id-display">${partyId}</span></p>
        <div class="watch-party-container">
          <div class="video-section">
            <div class="watch-party-video-container">
              <video class="watch-party-video" id="partyVideo">
                <source src="./assets/video/video_watchparty.mp4" type="video/mp4">
                Your browser does not support the video tag.
              </video>
              <div class="watch-party-controls">
                <div class="party-controls">
                  <button class="watch-party-btn-control sync-btn">Sync with Party</button>
                  <button class="watch-party-btn-control maximize-btn">Full Screen</button>
                </div>
                <div class="video-controls">
                  <button class="watch-party-btn-control play-btn">Play for Everyone</button>
                  <button class="watch-party-btn-control pause-btn">Pause for Everyone</button>
                </div>
              </div>
            </div>
            <div class="invite-section my-4">
              <h3 class="text-white text-lg mb-2">Invite Friends</h3>
              <div class="flex">
                <input type="text" class="invite-link" readonly value="${partyId}" />
                <button class="copy-btn">Copy</button>
              </div>
              <p class="text-sm text-gray-400 mt-2">Share this code with friends to join this watch party</p>
            </div>
            <div class="participants">
              <h3 class="text-white text-lg mb-2">Participants</h3>
              <div class="participants-list">
                <!-- Participants will be dynamically added here -->
              </div>
            </div>
          </div>
          <div class="chat-section">
            <div class="chat-container">
              <h3 class="text-white text-lg mb-2">Chat</h3>
              <div class="chat-messages">
                <!-- Messages will be dynamically added here -->
              </div>
              <div class="chat-input-container">
                <input type="text" class="chat-input" placeholder="Type a message..." />
                <button class="send-btn">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => {
      modal.style.display = 'block';
    }, 10);

    // Add events
    setupModalEventListeners(modal, partyId);
    
    // Setup realtime DB
    setupRealtimeListeners(partyId);
  }

  function setupRealtimeListeners(partyId) {
    console.log("Setting up realtime listeners for party:", partyId);
    
    // Setup DB refs if needed
    if (!partyRef) {
      partyRef = database.ref(`parties/${partyId}`);
    }
    if (!participantsRef) {
      participantsRef = database.ref(`parties/${partyId}/participants`);
    }
    if (!messagesRef) {
      messagesRef = database.ref(`parties/${partyId}/messages`);
    }
    if (!videoStateRef) {
      videoStateRef = database.ref(`parties/${partyId}/videoState`);
    }
    
    // Track participants
    participantsRef.on('value', (snapshot) => {
      console.log("Participants updated:", snapshot.val());
      updateParticipantsList(snapshot.val());
    });
    
    // For new participants, don't send system messages when users join
    participantsRef.on('child_added', (snapshot, prevChildKey) => {
      // We're still tracking new participants for the UI, but not sending chat notifications
      const participant = snapshot.val();
      if (participant && participant.id === currentUser.id) {
        return;
      }
      
      // Just log the new participant
      if (prevChildKey !== null) {
        console.log("New participant added:", participant);
      }
    });
    
    // Track chat
    messagesRef.on('child_added', (snapshot) => {
      console.log("New message:", snapshot.val());
      const message = snapshot.val();
      appendMessage(message);
    });
    
    // Track video sync
    videoStateRef.on('value', (snapshot) => {
      console.log("Video state updated:", snapshot.val());
      const videoState = snapshot.val();
      
      // Ensure state exists
      if (videoState) {
        handleVideoStateChange(videoState);
      } else {
        console.warn("Received empty video state, attempting to initialize it");
        // Create default
        videoStateRef.set({
          isPlaying: false,
          currentTime: 0,
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name
        });
      }
    });
  }
  
  function updateParticipantsList(participants) {
    if (!participants) return;
    
    const participantsElement = document.querySelector('.participants-list');
    if (!participantsElement) return;
    
    // Clear list
    participantsElement.innerHTML = '';
    
    // List participants
    Object.values(participants).forEach(participant => {
      const participantElement = document.createElement('div');
      participantElement.className = 'participant';
      participantElement.innerHTML = `
        <div class="participant-avatar">${participant.name.charAt(0)}</div>
        <div class="participant-name">${participant.name} ${participant.isHost ? '<span class="host-badge">Host</span>' : ''}</div>
      `;
      participantsElement.appendChild(participantElement);
    });
  }
  
  function appendMessage(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    
    if (message.type === 'system') {
      messageElement.className = 'message system-message';
      messageElement.innerHTML = `
        <div class="message-text">${message.text}</div>
      `;
    } else {
      messageElement.className = 'message';
      messageElement.innerHTML = `
        <div class="message-sender">${message.sender || 'Anonymous'}</div>
        <div class="message-text">${message.text}</div>
      `;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Notify new message
    const chatContainer = chatMessages.closest('.chat-container');
    if (chatContainer) {
      chatContainer.style.boxShadow = '0 0 10px #e50914';
      setTimeout(() => {
        chatContainer.style.boxShadow = 'none';
      }, 1000);
    }
  }
  
  function handleVideoStateChange(videoState) {
    if (!videoState) return;
    
    const video = document.querySelector('.watch-party-video');
    if (!video) return;
    
    // Skip if self-update
    if (videoState.updatedBy !== currentUser.id) {
      // Play/pause
      if (videoState.isPlaying && video.paused) {
        video.play();
        appendSystemMessage(`Video playback started by ${videoState.updatedByName || 'another user'}.`);
      } else if (!videoState.isPlaying && !video.paused) {
        video.pause();
        appendSystemMessage(`Video paused by ${videoState.updatedByName || 'another user'}.`);
      }
      
      // Time sync
      if (Math.abs(video.currentTime - videoState.currentTime) > 1) {
        video.currentTime = videoState.currentTime;
        appendSystemMessage(`Video synchronized to ${formatTime(videoState.currentTime)}.`);
      }
    }
  }
  
  function updateVideoState(isPlaying, currentTime) {
    if (!videoStateRef) return;
    
    console.log("Updating video state:", { isPlaying, currentTime });
    
    videoStateRef.update({
      isPlaying: isPlaying,
      currentTime: currentTime,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name
    });
  }
  
  function sendMessage(text) {
    if (!messagesRef) return;
    
    console.log("Sending message:", text);
    
    messagesRef.push({
      text: text,
      sender: currentUser.name,
      senderId: currentUser.id,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      type: 'user'
    });
  }
  
  function sendSystemMessage(text) {
    if (!messagesRef) return;
    
    console.log("Sending system message:", text);
    
    messagesRef.push({
      text: text,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      type: 'system'
    });
  }
  
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function setupModalEventListeners(modal, partyId) {
    console.log("Setting up modal event listeners");
    
    // Close and clean up
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
      leaveParty();
      modal.style.display = 'none';
      setTimeout(() => {
        modal.remove();
      }, 300);
    });

    // Toggle fullscreen
    const maximizeModalBtn = modal.querySelector('.maximize-modal');
    if (maximizeModalBtn) {
      maximizeModalBtn.addEventListener('click', () => {
        modal.classList.toggle('maximized');
        
        if (modal.classList.contains('maximized')) {
          maximizeModalBtn.textContent = '⧉';
        } else {
          maximizeModalBtn.textContent = '⛶';
        }
      });
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        leaveParty();
        modal.style.display = 'none';
        setTimeout(() => {
          modal.remove();
        }, 300);
      }
    });

    // Copy party code
    const copyBtn = modal.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
      const inviteLink = modal.querySelector('.invite-link');
      inviteLink.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 2000);
    });

    // Chat setup
    const chatInput = modal.querySelector('.chat-input');
    const sendBtn = modal.querySelector('.send-btn');

    function handleSendMessage() {
      const message = chatInput.value.trim();
      if (message) {
        sendMessage(message);
        chatInput.value = '';
      }
    }

    sendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSendMessage();
      }
    });

    // Video player controls
    const video = modal.querySelector('.watch-party-video');
    const playBtn = modal.querySelector('.play-btn');
    const pauseBtn = modal.querySelector('.pause-btn');
    const syncBtn = modal.querySelector('.sync-btn');
    const maximizeBtn = modal.querySelector('.maximize-btn');

    playBtn.addEventListener('click', () => {
      video.play();
      updateVideoState(true, video.currentTime);
    });

    pauseBtn.addEventListener('click', () => {
      video.pause();
      updateVideoState(false, video.currentTime);
    });

    syncBtn.addEventListener('click', () => {
      if (videoStateRef) {
        videoStateRef.once('value').then(snapshot => {
          const state = snapshot.val();
          if (state) {
            video.currentTime = state.currentTime;
            appendSystemMessage(`Synchronized with the party at ${formatTime(state.currentTime)}.`);
          }
        });
      }
    });
    
    // Fullscreen video button
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        const videoContainer = modal.querySelector('.watch-party-video-container');
        
        if (videoContainer.classList.contains('video-fullscreen')) {
          // Exit fullscreen
          videoContainer.classList.remove('video-fullscreen');
          maximizeBtn.textContent = 'Full Screen';
          
          // If browser is in fullscreen mode, exit that too
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
        } else {
          // Enter fullscreen
          videoContainer.classList.add('video-fullscreen');
          maximizeBtn.textContent = 'Exit Full Screen';
          
          // Try to use browser's fullscreen API if available
          if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
          }
        }
      });
    }

    // Direct video events for more accurate syncing
    video.addEventListener('play', () => {
      if (videoStateRef) {
        updateVideoState(true, video.currentTime);
      }
    });

    video.addEventListener('pause', () => {
      if (videoStateRef) {
        updateVideoState(false, video.currentTime);
      }
    });

    // Sync every 5 secs
    videoSyncInterval = setInterval(() => {
      if (videoStateRef && !video.paused) {
        updateVideoState(true, video.currentTime);
      }
    }, 5000);
  }

  function leaveParty() {
    console.log("Leaving party");
    
    // Clear intervals
    if (videoSyncInterval) {
      clearInterval(videoSyncInterval);
      videoSyncInterval = null;
    }
    
    // Remove user
    if (participantsRef && currentUser) {
      participantsRef.child(currentUser.id).remove();
    }
    
    // Send leave msg
    if (messagesRef && currentUser) {
      sendSystemMessage(`${currentUser.name} left the party.`);
    }
    
    // Remove listeners
    if (participantsRef) {
      participantsRef.off();
    }
    if (messagesRef) {
      messagesRef.off();
    }
    if (videoStateRef) {
      videoStateRef.off();
    }
    
    // Reset state
    partyRef = null;
    participantsRef = null;
    messagesRef = null;
    videoStateRef = null;
    currentPartyId = null;
    isHost = false;
  }

  function appendSystemMessage(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      const systemMessage = document.createElement('div');
      systemMessage.className = 'message system-message';
      systemMessage.innerHTML = `
        <div class="message-text">${message}</div>
      `;
      chatMessages.appendChild(systemMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  
  function setupWatchPartyPageListeners() {
    console.log("Setting up watch party page listeners");
    
    // Find join button
    let joinPartyBtn = document.querySelector('.bg-red-600.rounded-r-md');
    
    // Try alt selectors
    if (!joinPartyBtn) {
      console.log("First join button selector failed, trying alternatives");
      joinPartyBtn = document.querySelector('button[type="submit"]');
    }
    
    if (!joinPartyBtn) {
      console.log("Second join button selector failed, trying more alternatives");
      joinPartyBtn = document.querySelector('button.join-party-btn');
      if (!joinPartyBtn) {
        // Try red button
        joinPartyBtn = document.querySelector('.bg-red-600');
      }
    }
    
    // Add join handler
    if (joinPartyBtn) {
      console.log("Join party button found:", joinPartyBtn);
      
      // Onclick for debug
      joinPartyBtn.onclick = function(e) {
        console.log("Join button clicked directly via onclick");
        handleJoinButtonClick(e);
      };
      
      // Normal listener
      joinPartyBtn.addEventListener('click', handleJoinButtonClick);
    } else {
      console.error("Join party button not found with any selector");
      // Last resort
      console.log("Adding handlers to all buttons as fallback");
      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function(e) {
          console.log("Generic button clicked:", btn.textContent || btn.className);
          // Check if join button
          if (btn.textContent?.includes('Join') || 
              btn.className?.includes('join') || 
              btn.className?.includes('red')) {
            handleJoinButtonClick(e);
          }
        });
      });
    }
    
    // Join button handler
    function handleJoinButtonClick(e) {
      console.log("Join button click handler called");
      
      // Find input field
      let partyCodeInput = document.querySelector('.bg-gray-800.rounded-l-md');
      
      if (!partyCodeInput) {
        console.log("First input selector failed, trying alternatives");
        partyCodeInput = document.querySelector('input[type="text"]');
      }
      
      if (!partyCodeInput) {
        console.log("Second input selector failed, trying more alternatives");
        partyCodeInput = document.querySelector('input.party-code');
        if (!partyCodeInput) {
          // Any input
          const allInputs = document.querySelectorAll('input');
          console.log("Found inputs:", allInputs.length);
          if (allInputs.length > 0) {
            partyCodeInput = allInputs[0];
          }
        }
      }
      
      if (partyCodeInput) {
        const partyCode = partyCodeInput.value.trim();
        console.log("Joining party with code:", partyCode);
        
        if (partyCode) {
          e.preventDefault();
          joinParty(partyCode);
        } else {
          console.error("Party code is empty");
          alert('Please enter a valid party code.');
        }
      } else {
        console.error("Party code input not found with any selector");
        
        // Prompt user
        const manualCode = prompt("Enter party code to join:");
        if (manualCode && manualCode.trim()) {
          joinParty(manualCode.trim());
        }
      }
    }
    
    // Add listeners to party cards
    const joinButtons = document.querySelectorAll('.bg-red-600.rounded');
    console.log("Found party card join buttons:", joinButtons.length);
    
    if (joinButtons.length === 0) {
      console.log("Trying alternative selectors for join buttons");
      const altJoinButtons = document.querySelectorAll('button:not(.send-btn):not(.copy-btn)');
      console.log("Found alternative join buttons:", altJoinButtons.length);
      
      altJoinButtons.forEach(button => {
        // Check for join buttons
        if (button.textContent?.includes('Join') || 
            button.className?.includes('join') || 
            button.className?.includes('red')) {
          
          console.log("Adding listener to alternative join button:", button.textContent || button.className);
          button.addEventListener('click', handlePartyCardJoin);
        }
      });
    } else {
      joinButtons.forEach(button => {
        button.addEventListener('click', handlePartyCardJoin);
      });
    }
    
    function handlePartyCardJoin(e) {
      console.log("Party card join button clicked");
      
      // Find party ID
      let partyId = null;
      
      // From card attribute
      const card = e.target.closest('.bg-zinc-900, .card, [data-party-id]');
      if (card) {
        partyId = card.getAttribute('data-party-id');
        console.log("Found party ID from card attribute:", partyId);
      }
      
      // From parent elements
      if (!partyId) {
        let element = e.target;
        while (element && !partyId) {
          partyId = element.getAttribute('data-party-id');
          element = element.parentElement;
        }
        if (partyId) console.log("Found party ID from parent hierarchy:", partyId);
      }
      
      // From nearby elements
      if (!partyId) {
        const partyIdElement = e.target.closest('div, section, article')?.querySelector('.party-id-display, [data-party-id]');
        if (partyIdElement) {
          partyId = partyIdElement.getAttribute('data-party-id') || partyIdElement.textContent.trim();
          console.log("Found party ID from nearby element:", partyId);
        }
      }
      
      if (partyId) {
        e.preventDefault();
        e.stopPropagation();
        joinParty(partyId);
      } else {
        console.error("Could not find party ID with any method");
        alert("Error: Could not determine which party to join. Please enter a party code manually.");
        
        // Manual prompt
        const manualCode = prompt("Enter party code to join:");
        if (manualCode && manualCode.trim()) {
          joinParty(manualCode.trim());
        }
      }
    }
    
    // Global click handler for join buttons
    document.addEventListener('click', function(e) {
      // Check for join buttons
      const target = e.target;
      
      if (target.tagName === 'BUTTON' || 
          target.className?.includes('btn') || 
          target.className?.includes('button')) {
        
        if (target.textContent?.includes('Join') || 
            target.className?.includes('join') || 
            target.className?.includes('red')) {
          
          console.log("Caught potential join button click through document listener:", 
                     target.textContent || target.className);
          
          // Don't handle if it's a button we've already added listeners to
          if (!target.hasJoinHandler) {
            e.stopPropagation();
            
            // Mark this element to prevent double handling
            target.hasJoinHandler = true;
            
            // Try to find a party code input
            const possibleInputs = document.querySelectorAll('input');
            let partyCode = null;
            
            for (const input of possibleInputs) {
              if (input.value?.trim()) {
                partyCode = input.value.trim();
                console.log("Found potential party code in input:", partyCode);
                break;
              }
            }
            
            if (partyCode) {
              joinParty(partyCode);
            } else {
              const manualCode = prompt("Enter party code to join:");
              if (manualCode && manualCode.trim()) {
                joinParty(manualCode.trim());
              }
            }
          }
        }
      }
    });
  }
  
  // If URL has a party ID parameter, join that party automatically
  const urlParams = new URLSearchParams(window.location.search);
  const partyIdFromUrl = urlParams.get('partyId');
  if (partyIdFromUrl) {
    console.log("Found party ID in URL:", partyIdFromUrl);
    // Small delay to ensure everything is initialized
    setTimeout(() => {
      joinParty(partyIdFromUrl);
    }, 500);
  }
}); 