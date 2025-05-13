import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ChatbotService } from './chatbot.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('scrollMe') private chatContainer!: ElementRef;
  messages: { sender: string, text: string,isTyping?:boolean }[] = [];
  userMessage: string = '';
  isListening: boolean = false;
  selectedLanguage: string = 'en'; // Default language: English
  // Available languages (ISO 639-1 codes)
  languages: { code: string, name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' }
    // Add more languages as supported by the translation model
  ];

  private recognition: any;
  private hasSentMessage = false;
  //public isStarting: boolean = false;

  constructor(private chatbotService: ChatbotService) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        this.userMessage = transcript;
      };

      this.recognition.onspeechend  = () => {
        this.recognition.stop();
        this.isListening = false;
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        alert('Speech recognition error: ' + event.error);
      };
    } else {
      console.warn('SpeechRecognition API not supported in this browser.');
    }
  }

  toggleSidenav() {
    this.sidenav.toggle();
  }

  sendMessage() {
    if (!this.userMessage.trim()) return;

    this.messages.push({ sender: 'user', text: this.userMessage , isTyping:false });
    
    // Add typing indicator (bot is "thinking")
    const typingIndicator = { sender: 'bot', text: 'Generating...', isTyping: true };
    this.messages.push(typingIndicator);

    this.chatbotService.sendMessage(this.userMessage).subscribe(
      (response: any) => {
        // Remove the typing indicator
        this.messages = this.messages.filter(msg => !msg.isTyping);

        response.forEach((msg: any) => {
          this.messages.push({ sender: 'bot', text: msg.text ,isTyping:false});
        });
      },
      (error) => {
        console.error('Error sending message:', error);
        this.messages = this.messages.filter(msg => !msg.isTyping);
        this.messages.push({ sender: 'bot', text: 'Error: Could not connect to the chatbot.' });
      }
    );

    this.userMessage = '';
  }

  clearMessages() {
    this.messages = [];
  }

  startVoiceInput() {
    if (!this.recognition) {
      alert('SpeechRecognition API is not supported in this browser.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.isListening = true;
      this.recognition.lang = this.selectedLanguage + '-' + this.selectedLanguage.toUpperCase(); // e.g., 'es-ES'
      this.recognition.start();
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }
  getVoiceButtonImage(): string {
    // if (this.isStarting) {
    //  //return 'assets/images/spinner.gif'; // loading spinner
    //  return 'assets/images/settings_voice_24dp_FF0000.png'; // red mic
    // }
    if (this.isListening) {
      return 'assets/images/settings_voice_24dp_FF0000.png'; // red mic
    }
    if (this.hasSentMessage) {
      return 'assets/images/pause_24dp_333.png'; // pause icon
    }
    return 'assets/images/mic_24dp_333.png'; // default mic
  }
  
}