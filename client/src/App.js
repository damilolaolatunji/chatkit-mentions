import React, { Component } from 'react';
import axios from 'axios';
import Chatkit from '@pusher/chatkit-client';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';

import 'skeleton-css/css/normalize.css';
import 'skeleton-css/css/skeleton.css';
import './App.css';

class App extends Component {
  constructor() {
    super();
    this.state = {
      currentUser: null,
      currentRoom: null,
      newMessage: '',
      messages: [],
      roomUsers: [],
    };
  }

  addUser = event => {
    event.preventDefault();
    const { userId } = this.state;
    axios
      .post('http://localhost:5200/users', { userId })
      .then(() => {
        const tokenProvider = new Chatkit.TokenProvider({
          url: 'http://localhost:5200/authenticate',
        });

        const chatManager = new Chatkit.ChatManager({
          instanceLocator: '<your chatkit instance locator>',
          userId,
          tokenProvider,
        });

        return chatManager.connect().then(currentUser => {
          this.setState(
            {
              currentUser,
            },
            () => this.connectToRoom()
          );
        });
      })
      .catch(console.error);
  };

  sendMessage = () => {
    const { newMessage, currentUser, currentRoom } = this.state;

    if (newMessage.trim() === '') return;

    currentUser.sendMessage({
      text: newMessage,
      roomId: `${currentRoom.id}`,
    });

    this.setState({
      newMessage: '',
    });
  };

  handleInput = event => {
    const { value, name } = event.target;

    this.setState({
      [name]: value,
    });
  };

  handleKeyPress = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.sendMessage();
    }
  };

  connectToRoom = () => {
    const { currentUser } = this.state;

    return currentUser
      .subscribeToRoom({
        roomId: '<your chatkit room id>',
        messageLimit: 0,
        hooks: {
          onMessage: message => {
            this.setState({
              messages: [...this.state.messages, message],
            });
          },
          onPresenceChanged: () => {
            const { currentRoom } = this.state;
            if (currentRoom) {
              this.setState({
                roomUsers: currentRoom.users.sort(a => {
                  if (a.presence.state === 'online') return -1;

                  return 1;
                }),
              });
            }
          },
        },
      })
      .then(currentRoom => {
        this.setState({
          currentRoom,
          roomUsers: currentRoom.users,
        });
      });
  };

  insertTextAtIndices = (text, obj) => {
    return text.replace(/./g, function(character, index) {
      return obj[index] ? obj[index] + character : character;
    });
  };

  render() {
    const {
      newMessage,
      roomUsers,
      currentRoom,
      messages,
      currentUser,
    } = this.state;

    const UserList = roomUsers.map(user => {
      return (
        <li className="user" key={user.name}>
          <span className={`presence ${user.presence.state}`} />
          <span>{user.name}</span>
        </li>
      );
    });

    const filterUserNames = token =>
      roomUsers.filter(user => user.name.includes(token));

    const ChatSession = messages.map(message => {
      const messageText = message.text;
      const mentions = messageText.match(/@[a-zA-Z0-9]+/g) || [];
      const roomUserNames = this.state.roomUsers.map(user => `@${user.name}`);
      const mentionedUsers = mentions.filter(username =>
        roomUserNames.includes(username)
      );

      let text = messageText;
      mentionedUsers.forEach(user => {
        const startIndex = text.indexOf(user);
        const endIndex = startIndex + user.length;
        const isCurrent =
          currentUser.name === user.substring(1) ? 'is-current' : '';
        text = this.insertTextAtIndices(text, {
          [startIndex]: `<span class="mentioned-user ${isCurrent}">`,
          [endIndex]: '</span>',
        });
      });

      return (
        <li className="message" key={message.id}>
          <span className="user-id">{message.senderId}</span>
          <span
            dangerouslySetInnerHTML={{
              __html: text,
            }}
          />
        </li>
      );
    });

    return (
      <div className="App">
        <aside className="sidebar">
          {!currentUser ? (
            <section className="join-chat">
              <h3>Join Chat</h3>
              <form onSubmit={this.addUser}>
                <input
                  placeholder="Enter your username"
                  type="text"
                  name="userId"
                  onChange={this.handleInput}
                />
              </form>
            </section>
          ) : null}

          {currentUser ? (
            <section className="room-users">
              <h3>Room Users</h3>
              <ul>{UserList}</ul>
            </section>
          ) : null}
        </aside>

        <section className="chat-screen">
          <header className="room-name">
            <h3>{currentRoom ? currentRoom.name : 'Chat'}</h3>
          </header>
          <ul className="chat-session">{ChatSession}</ul>
          <form onSubmit={this.sendMessage} className="message-form">
            <ReactTextareaAutocomplete
              className="message-input my-textarea"
              name="newMessage"
              value={newMessage}
              loadingComponent={() => <span>Loading</span>}
              onKeyPress={this.handleKeyPress}
              onChange={this.handleInput}
              placeholder="Compose your message and hit ENTER to send"
              trigger={{
                '@': {
                  dataProvider: token => {
                    return [...filterUserNames(token)];
                  },
                  component: ({ entity: { name } }) => <div>{`${name}`}</div>,
                  output: item => `@${item.name}`,
                },
              }}
            />
          </form>
        </section>
      </div>
    );
  }
}

export default App;
