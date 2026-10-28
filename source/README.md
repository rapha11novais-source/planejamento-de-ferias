# Preferências de férias de 2027 · 4º Pelotão

Formulário público, sem login para os policiais: nome completo, matrícula e três meses distintos, em ordem de preferência. A indicação não garante a concessão das férias nos períodos solicitados. Não há prazo de encerramento configurado.

Uma resposta por matrícula. Após o envio, o policial recebe um link pessoal para consultar e atualizar sua própria resposta. O painel dos organizadores apresenta a relação nominal, filtros por mês e ordem de preferência, procura mensal e exportações Excel/PDF.

## Supabase

1. Aplicar `supabase/migrations/20261028164537_vacation_preferences_2027.sql`. Cria somente a tabela `vacation_4p_2027`, o esquema interno `vacation_4p_internal` e as funções `vacation_4p_load` e `vacation_4p_save`. A migração da confraternização permanece no histórico; os registros antigos não são convertidos ou apagados.
2. Configurar `public/config.js` com a URL e a chave pública **publishable** do projeto. Nunca publicar service_role, senhas, chaves secretas ou tokens pessoais.
3. Habilitar o provedor de e-mail no Supabase Auth. O painel é exclusivo de `rapha11novais@gmail.com`, por autenticação e política RLS no banco.
4. No primeiro acesso em `#admin`, escolher **Definir ou recuperar senha**, verificar o e-mail e definir uma senha de pelo menos 12 caracteres. Os acessos seguintes usam e-mail e senha. O próprio usuário solicita o e-mail de confirmação; nenhuma senha é incluída no código.
5. Em Authentication → URL Configuration, incluir a URL exata do GitHub Pages, com a barra final, como Site URL e Redirect URL. Alternativamente, copiar o link de confirmação do e-mail e colá-lo no painel para verificá-lo diretamente com o Supabase.

Os papéis públicos não podem ler ou modificar diretamente a tabela. O organizador autenticado lê apenas as colunas de relatório, sem o hash dos tokens. As funções públicas permitem criar uma resposta ou consultar/editar a resposta correspondente ao token pessoal de 256 bits; o banco armazena somente seu SHA-256. Nome, matrícula, meses, distinção entre opções e versão são validados no servidor. A matrícula é imutável na atualização, e alterações com versão desatualizada são recusadas.

## Build e publicação

```sh
npm ci
npm run build
```

Publicar o conteúdo de `dist/` na raiz de `main`, conforme a configuração existente do GitHub Pages, mantendo o projeto editável em `source/` e `.nojekyll` na raiz. Os caminhos relativos permitem o funcionamento no subdiretório do repositório. Não incluir respostas reais ou links pessoais no GitHub.

## Validação

- Nome, matrícula e três opções obrigatórias; meses repetidos recusados na interface e no banco.
- Matrícula duplicada, token incorreto e versão desatualizada recusados.
- Anônimo sem acesso à tabela; outro e-mail autenticado sem leitura do relatório.
- Resumo mantém a ordem das opções e exibe a ressalva sobre disponibilidade e necessidade do serviço.
- Layout responsivo e exportações com matrículas preservadas como texto, incluindo zeros iniciais.

Os arquivos estáticos são públicos; a exclusividade dos dados administrativos é imposta pelo Supabase Auth e pelo PostgreSQL.
