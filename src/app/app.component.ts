import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ChatbotService } from './chatbot.service';
// export interface MacroSelectionListComponentContext extends ComponentContext {
//   list: SelectionListItemWithCategory[];

// }
// export interface SelectionListItemWithCategory extends SelectionListItem {
//   category?: string;
// }

export interface ChatButton {
  title: string;
  payload: string;
}
export interface ChatMessage {
   sender: string;
   text: string;
   isTyping: boolean;
   buttons?: ChatButton[];
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('scrollMe') private chatContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  messages: ChatMessage[] = [];
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
  isTtsEnabled: boolean = false;
  private speechSynthesis!: SpeechSynthesis;
  public voice: SpeechSynthesisVoice | null = null;

  constructor(private chatbotService: ChatbotService) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const voices = window.speechSynthesis.getVoices();
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
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    } else {
      console.warn('SpeechSynthesis API not supported in this browser.');
    }
  }

  toggleSidenav() {
    this.sidenav.toggle();
  }

  sendMessage(showTypingIndicator: boolean = true) {
    if (!this.userMessage.trim()) return;
    
    this.messages.push({ sender: 'user', text: this.userMessage,isTyping:false });
    
    if (showTypingIndicator) {
      // Add typing indicator (bot is "thinking")
      const typingIndicator:ChatMessage = { sender: 'bot', text: 'Generating...', isTyping: true };
      this.messages.push(typingIndicator);
    }

    this.chatbotService.sendMessage(this.userMessage).subscribe(
      (response: any) => {
        this.handleBotResponse(response);
      },
      (error) => {
        console.error('Error sending message:', error);
         this.messages = this.messages.filter(msg => !msg.isTyping);
        const errorMessage = { sender: 'bot', text: 'Error: Could not connect to the chatbot.' ,isTyping:false};        
        this.messages.push(errorMessage);
        this.speak(errorMessage.text);
      }
    );

    this.userMessage = '';
  }
  private filterSpokenContent(text: string): string {
  // Remove markdown links like [text](url)
  text = text.replace(/\[.*?\]\(.*?\)/g, '');
  // Remove 'Related topics' or other structured tags
  text = text.replace(/Related topics:.*$/gi, '');
  // Optional: strip emojis
  text = text.replace(/[\u{1F300}-\u{1F6FF}]/gu, '');
  // Trim and clean extra spaces
  return text.trim();
}

  private handleBotResponse(response: any) {
    this.messages = this.messages.filter(msg => !msg.isTyping);
    response.forEach((msg: any) => {
      const botMessage: ChatMessage = { 
        sender: 'bot', 
        text: msg.text, 
        isTyping: false,
        buttons: msg.buttons || [] 
      };
      this.messages.push(botMessage);
      this.speak(botMessage.text);

      // --- Sample Code to Execute Command ---
      // Extracts command if it's wrapped in backticks, e.g., `setTemperatureUnits(0)`
      // const commandRegex = /(\w+\(.*\))/;;
      // const match = botMessage.text.match(commandRegex);
      // //console.log(botMessage.text,match,match[1])
      // if (match && match[1]) {
      //   const command = match[1];
      //   console.log('Executing command:', botMessage.text,command, match[2]);
      //   this.preferencesService.executeCommandFromString(command)
      //     .then((result) => {
      //       console.log('Preference command executed successfully.','typeof result:', typeof result,'result:', result);
      //       let successMessage;
      //       // Optional: Add a message to the chat confirming the action
      //       if (result !=undefined) {
      //         successMessage = { sender: 'bot', text: `I've retrieve the setting. result:`+ result, isTyping: false };

      //       }
      //       else {
      //         successMessage = { sender: 'bot', text: `I've updated the setting.`, isTyping: false };
      //       }
      //       this.messages.push(successMessage);
      //       this.speak(successMessage.text);

      //       // If the command was to draw a graph, show a link to the dashboard
      //       // if (command.startsWith('drawGraph')) {
              
      //       //   const linkMessage = { sender: 'bot', text: `I've updated the dashboard for you. [Click here to view it](/dashboard).`, isTyping: false };
      //       //   this.messages.push(linkMessage);
      //       //   this.speak("I've updated the dashboard for you. Click the link to view it.");
      //       // }
      //     })
      //     .catch(error => {
      //       console.error('Failed to execute preference command:', error);
      //       // const errorMessage = { sender: 'bot', text: `I couldn't apply that setting. Please try again.`, isTyping: false };
      //       // this.messages.push(errorMessage);
      //       // this.speak(errorMessage.text);
      //     });
      // }
      // --- End of Sample Code ---
    });
  }

  handleButtonClick(payload: string) {
    this.userMessage = payload;
    this.sendMessage(false);
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

  toggleTts() {
    this.isTtsEnabled = !this.isTtsEnabled;
    if (!this.isTtsEnabled) {
      this.speechSynthesis.cancel();
    }
  }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  handleFileUpload(event: any): void {
    const file: File = event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const fileContent = e.target.result;
      this.userMessage = `The content of the file "${file.name}" is:\n\n${fileContent}`;
      this.sendMessage();
      if (this.fileInput.nativeElement) {
        this.fileInput.nativeElement.value = "";
      }
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      const errorMessage = { sender: 'bot', text: `Sorry, I couldn't read the file ${file.name}.`, isTyping: false };
      this.messages.push(errorMessage);
      this.speak(errorMessage.text);
    };
    reader.readAsText(file);
  }

  private speak(text: string) {
    if (!this.isTtsEnabled || !this.speechSynthesis) {
      return;
    }

    // Sanitize the text to remove URLs and specific words before speaking
    // const urlRegex = /(https?:\/\/[^\s]+)/g;
    // const referenceRegex = /reference/gi;
    //const cleanText = text.replace(urlRegex, '').replace(referenceRegex, '');
     const cleanText = this.filterSpokenContent(text);    

    // If the text is empty after cleaning, don't attempt to speak
    if (!cleanText.trim()) {
      return;
    }
   
    if (!this.voice) {
      const voices = window.speechSynthesis.getVoices();
      this.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || null;
    }
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';         // Language
    utterance.pitch = 1;              // Pitch (0 to 2)
    utterance.rate = 1;               // Speed (0.1 to 10)
    utterance.volume = 1;            // Volume (0 to 1)
    utterance.voice = this.voice;
    utterance.lang = this.selectedLanguage + '-' + this.selectedLanguage.toUpperCase();
    this.speechSynthesis.speak(utterance);
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