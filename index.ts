import { registerRootComponent } from 'expo';
import App from './App';

// Plain Expo entry: one root app, no router shell. Tabs and sheets are app state,
// which keeps the conversation mounted when a garment sheet opens.
registerRootComponent(App);
