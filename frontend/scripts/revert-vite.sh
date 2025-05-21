#!/bin/bash

# Script para reverter a migração para o Vite e voltar para o Create React App (react-scripts)

echo "Iniciando processo de reversão para react-scripts..."

# Instalar react-scripts
npm install react-scripts@5.0.1 --save --legacy-peer-deps

# Remover dependências específicas do Vite
npm uninstall vite @vitejs/plugin-react vite-tsconfig-paths vitest jsdom rollup @rollup/plugin-typescript @rollup/plugin-commonjs @rollup/plugin-node-resolve @rollup/plugin-terser --legacy-peer-deps

# Restaurar scripts do package.json
sed -i 's/"dev": "vite",//g' package.json
sed -i 's/"start": "vite"/"start": "react-scripts start"/g' package.json
sed -i 's/"build": "tsc && vite build"/"build": "react-scripts build"/g' package.json
sed -i 's/"preview": "vite preview",//g' package.json
sed -i 's/"test": "vitest"/"test": "react-scripts test"/g' package.json

# Reverter mudanças em arquivos de configuração
if [ -f "vite.config.ts" ]; then
  rm vite.config.ts
fi

if [ -f "vitest.config.ts" ]; then
  rm vitest.config.ts
fi

if [ -f "env.d.ts" ]; then
  rm env.d.ts
fi

if [ -f "src/vite-env.d.ts" ]; then
  rm src/vite-env.d.ts
fi

# Mover index.html de volta para a pasta public
if [ -f "index.html" ]; then
  mv index.html public/
fi

# Restaurar importações de variáveis de ambiente em src/services/api.ts
sed -i 's/import.meta.env.VITE_API_URL/process.env.REACT_APP_API_URL/g' src/services/api.ts

# Restaurar importações de variáveis de ambiente em src/utils/helpers.ts
sed -i 's/import.meta.env.MODE/process.env.NODE_ENV/g' src/utils/helpers.ts
sed -i 's/(import.meta.env\[`VITE_${key}`] as string)/(process.env\[`REACT_APP_${key}`])/g' src/utils/helpers.ts

echo "Reversão concluída. O projeto agora está configurado para usar react-scripts novamente."
echo "Execute 'npm start' para iniciar o servidor de desenvolvimento."
