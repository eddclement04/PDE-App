// PDE hamburger menu for navigation headings + logo display fix
(function(){
  function $(id){return document.getElementById(id);}

  function injectStyle(){
    if($('pdeHamburgerStyle')) return;
    const style=document.createElement('style');
    style.id='pdeHamburgerStyle';
    style.textContent=`
      .brand-mark.pde-logo-img-wrap{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:118px!important;
        height:80px!important;
        flex:0 0 118px!important;
        background:none!important;
        color:transparent!important;
        font-size:0!important;
        line-height:0!important;
        overflow:visible!important;
      }
      .brand-mark.pde-logo-img-wrap:before,
      .brand-mark.pde-logo-img-wrap:after{display:none!important;content:none!important;}
      .brand-mark.pde-logo-img-wrap img{
        display:block!important;
        width:118px!important;
        height:80px!important;
        object-fit:contain!important;
        object-position:center!important;
      }
      .pde-menu-toggle{
        display:none;
        align-items:center;
        justify-content:center;
        width:46px;
        height:42px;
        border:1px solid var(--line,#e6ebf4);
        border-radius:10px;
        background:#fff;
        color:var(--strong,#111a33);
        padding:0;
        box-shadow:0 10px 22px rgba(23,33,58,.07);
      }
      .pde-menu-toggle span,
      .pde-menu-toggle span:before,
      .pde-menu-toggle span:after{
        content:"";
        display:block;
        width:21px;
        height:2px;
        border-radius:99px;
        background:currentColor;
        transition:.2s ease;
        position:relative;
      }
      .pde-menu-toggle span:before{position:absolute;top:-7px;left:0;}
      .pde-menu-toggle span:after{position:absolute;top:7px;left:0;}
      .pde-menu-open .pde-menu-toggle span{background:transparent;}
      .pde-menu-open .pde-menu-toggle span:before{top:0;transform:rotate(45deg);background:var(--primary,#0755f5);}
      .pde-menu-open .pde-menu-toggle span:after{top:0;transform:rotate(-45deg);background:var(--primary,#0755f5);}

      @media(max-width:1180px){
        .sidebar{
          grid-template-columns:1fr auto!important;
          justify-items:stretch!important;
          align-items:center!important;
          gap:14px!important;
        }
        .brand{justify-self:start!important;}
        .brand-mark.pde-logo-img-wrap{width:108px!important;height:74px!important;flex-basis:108px!important;}
        .brand-mark.pde-logo-img-wrap img{width:108px!important;height:74px!important;}
        .pde-menu-toggle{display:inline-flex;justify-self:end;}
        .sidebar .nav{
          grid-column:1/-1;
          display:none!important;
          width:100%;
          margin-top:10px;
          padding:12px;
          border:1px solid var(--line,#e6ebf4);
          border-radius:18px;
          background:#fff;
          box-shadow:0 18px 40px rgba(23,33,58,.08);
        }
        .pde-menu-open .sidebar .nav{
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:8px;
        }
        .sidebar .nav-btn{
          width:100%;
          text-align:left;
          padding:14px 14px!important;
          border-radius:12px;
          background:#f8fbff;
        }
        .sidebar .nav-btn:after{display:none;}
        .sidebar .nav-btn.active{
          background:var(--primary-soft,#e8f0ff)!important;
          color:var(--primary,#0755f5)!important;
        }
        .sidebar-note{grid-column:1/-1;justify-self:stretch;justify-content:center;display:none!important;}
        .pde-menu-open .sidebar-note{display:flex!important;}
      }
      @media(max-width:760px){
        .pde-menu-open .sidebar .nav{grid-template-columns:1fr;}
        .brand h1,.brand p{display:none;}
        .brand-mark.pde-logo-img-wrap{width:96px!important;height:66px!important;flex-basis:96px!important;}
        .brand-mark.pde-logo-img-wrap img{width:96px!important;height:66px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function fixLogo(){
    const mark=document.querySelector('.brand-mark');
    if(!mark) return;
    mark.classList.add('pde-logo-img-wrap');
    if(mark.querySelector('img')) return;
    mark.textContent='';
    mark.style.background='none';
    const img=document.createElement('img');
    img.src='logo.png?v=2';
    img.alt='Perspective Designs & Estimates Logo';
    img.loading='eager';
    mark.appendChild(img);
  }

  function setupMenu(){
    const sidebar=document.querySelector('.sidebar');
    const nav=document.querySelector('.sidebar .nav');
    if(!sidebar || !nav) return;
    injectStyle();
    fixLogo();
    if($('pdeMenuToggle')) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='pdeMenuToggle';
    btn.className='pde-menu-toggle';
    btn.setAttribute('aria-label','Open navigation menu');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<span></span>';
    sidebar.insertBefore(btn, nav);

    btn.addEventListener('click',()=>{
      const open=document.body.classList.toggle('pde-menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });

    nav.addEventListener('click',e=>{
      if(e.target.closest('.nav-btn')){
        document.body.classList.remove('pde-menu-open');
        btn.setAttribute('aria-expanded','false');
        btn.setAttribute('aria-label','Open navigation menu');
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupMenu); else setupMenu();
})();