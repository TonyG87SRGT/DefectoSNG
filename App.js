const cards = document.querySelectorAll(".card");

cards.forEach(card => {

card.addEventListener("click", () => {

alert("Раздел находится в разработке");

});

});

const search = document.getElementById("search");

search.addEventListener("input",(e)=>{

console.log(e.target.value);

});
