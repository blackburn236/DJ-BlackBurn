# DJ BlackBurn — site online gratuito

Este projeto é um site completo para o DJ BlackBurn, com página pública, leitor de música e painel de administração.

## O que já está incluído
- Site responsivo para computador e telemóvel
- Página MY MUSIC
- Upload de MP3, WAV, M4A, AAC, OGG, FLAC e OPUS
- Capa JPG/PNG/WEBP
- Título, artista, género, ano e descrição
- Player de áudio
- Pesquisa e filtro por género
- Login de administrador
- Adicionar, editar e apagar músicas
- Armazenamento dos ficheiros no servidor
- Instagram do DJ BlackBurn

## Testar no computador
1. Instala Node.js.
2. Abre esta pasta no terminal.
3. Executa:
   npm install
4. Copia `.env.example` para `.env`.
5. No `.env`, muda `ADMIN_PASSWORD` e `SESSION_SECRET`.
6. Executa:
   npm start
7. Abre `http://localhost:3000`
8. Área de administração: `http://localhost:3000/admin.html`

## Colocar online sem pagar
O código não exige licença paga. Para ficar realmente acessível pela Internet precisas de um serviço de alojamento que permita executar Node.js.

IMPORTANTE: o armazenamento gratuito varia de serviço para serviço. Alguns alojamentos gratuitos apagam ficheiros enviados quando o servidor reinicia ou entra em suspensão. Como este site guarda as músicas no disco do servidor, escolhe um alojamento gratuito que mantenha o disco persistente, ou troca posteriormente o armazenamento local por um serviço gratuito de object storage.

Não coloques a tua palavra-passe real no GitHub. Define-a nas variáveis de ambiente do alojamento.

## Personalização
- Foto principal: `public/dj-blackburn.png`
- Página: `public/index.html`
- Estilo: `public/styles.css`
- Links sociais: `public/index.html`

## Nota
O limite por ficheiro está configurado para 250 MB. Pode ser aumentado no `server.js`, dependendo dos limites do alojamento escolhido.
