import 'svelte-querybuilder/dist/query-builder.css';
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

export default mount(App, { target: document.querySelector('#app')! });
