import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({root:resolve(import.meta.dirname,'portable'),publicDir:resolve(import.meta.dirname,'public'),plugins:[react()],resolve:{alias:{'@':resolve(import.meta.dirname)}},css:{postcss:resolve(import.meta.dirname)},build:{outDir:resolve(import.meta.dirname,'runtime-web'),emptyOutDir:true}});
