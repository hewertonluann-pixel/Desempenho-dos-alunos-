# 🔧 Como Configurar CORS no Firebase Storage

## ⚠️ Problema

O erro `CORS policy: Response to preflight request doesn't pass access control check` está bloqueando o upload de áudios porque o Firebase Storage não está configurado para aceitar requisições do domínio `https://filhosdeasafe.onrender.com`.

## ✅ Solução

Você precisa configurar as regras de CORS no Firebase Storage usando o **Google Cloud SDK**.

---

## 📋 Passo a Passo

### **1. Instalar o Google Cloud SDK**

Se ainda não tiver instalado:

**Windows:**
- Baixe: https://cloud.google.com/sdk/docs/install
- Execute o instalador

**macOS/Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

---

### **2. Fazer Login no Google Cloud**

```bash
gcloud auth login
```

Isso abrirá o navegador para você fazer login com a conta do Firebase.

---

### **3. Configurar o Projeto**

```bash
gcloud config set project asafenotas-5cf3f
```

---

### **4. Aplicar Configuração CORS**

Use o arquivo `cors.json` que está na raiz do projeto:

```bash
gsutil cors set cors.json gs://asafenotas-5cf3f.firebasestorage.app
```

---

### **5. Verificar se foi aplicado**

```bash
gsutil cors get gs://asafenotas-5cf3f.firebasestorage.app
```

Você deve ver a configuração aplicada.

---

## 📄 Conteúdo do cors.json

```json
[
  {
    "origin": ["https://filhosdeasafe.onrender.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "X-Requested-With"]
  }
]
```

---

## 🌐 Se Precisar Adicionar Mais Domínios

Edite o `cors.json` e adicione mais URLs:

```json
[
  {
    "origin": [
      "https://filhosdeasafe.onrender.com",
      "http://localhost:3000",
      "https://outro-dominio.com"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "X-Requested-With"]
  }
]
```

Depois aplique novamente:
```bash
gsutil cors set cors.json gs://asafenotas-5cf3f.firebasestorage.app
```

---

## 🔒 Alternativa: Permitir Todos os Domínios (Não Recomendado para Produção)

Se quiser permitir qualquer domínio (apenas para testes):

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "X-Requested-With"]
  }
]
```

⚠️ **Atenção:** Isso permite qualquer site acessar seu Storage. Use apenas em desenvolvimento!

---

## ✅ Após Configurar

1. Aguarde alguns minutos para a configuração propagar
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Teste o envio de lição novamente

O erro de CORS deve desaparecer! 🎉

---

## 📚 Documentação Oficial

- [Firebase Storage CORS](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)
- [Google Cloud CORS](https://cloud.google.com/storage/docs/configuring-cors)
