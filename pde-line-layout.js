// PDE line item layout fix for invoices and job costs
(function(){
  function injectLineLayout(){
    if(document.getElementById('pdeLineLayoutStyle')) return;
    const style = document.createElement('style');
    style.id = 'pdeLineLayoutStyle';
    style.textContent = `
      @media(min-width:761px){
        .line,
        .cost-line{
          grid-template-columns:minmax(260px,2fr) minmax(100px,.5fr) 84px minmax(170px,.95fr) 42px!important;
          align-items:end!important;
        }
        .line > button,
        .cost-line > button{
          grid-column:5!important;
          width:42px!important;
          min-width:42px!important;
          height:46px!important;
          align-self:end!important;
          justify-self:stretch!important;
          padding:0!important;
        }
        .line > label:nth-of-type(3),
        .cost-line > label:nth-of-type(3){
          min-width:78px!important;
        }
        .line > label:nth-of-type(4),
        .cost-line > label:nth-of-type(4){
          min-width:160px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',injectLineLayout); else injectLineLayout();
})();