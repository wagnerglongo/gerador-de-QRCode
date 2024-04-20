// selecionar
const container = document.querySelector(".container");
const qrCodeBtn = document.querySelector("#qr-form button");
const qrCodeInput = document.querySelector("#qr-form input");
const qrCodeImg = document.querySelector("#qr-code img");




// função
function generatorQrCode() {
  const qrCodeInputValue = qrCodeInput.value;

  if(!qrCodeInputValue) return;
  
  qrCodeBtn.innerText = "gerando código...";

  qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrCodeInputValue}`

  qrCodeImg.addEventListener("load", () => {
    container.classList.add("active");
    qrCodeBtn.innerText = "Código criado!";
  });
}


// Eventos

qrCodeBtn.addEventListener("click", () => {
  generatorQrCode();
})
qrCodeInput.addEventListener("keydown", (e) => {
  if(e.code === "Enter"){
    generatorQrCode();
  }
})

// limpar area do qr code
qrCodeInput.addEventListener("keyup", () => {
  if(!qrCodeInput.value){
    container.classList.remove("active");
    qrCodeBtn.innerText = "Gerar codigo"
  }
})