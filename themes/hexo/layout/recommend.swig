{% set ALL = '__ALL__' %}

{# 1) 收集 recommend 的所有取值（支持数组/字符串/布尔） #}
{% set recSet = [] %}
{% for post in site.posts %}
  {% set v = post.recommend %}
  {% if v %}
    {% if v is array %}
      {% for x in v %}{% if recSet.indexOf(x) == -1 %}{% set recSet = recSet.concat([x]) %}{% endif %}{% endfor %}
    {% elseif v is string %}
      {% if recSet.indexOf(v) == -1 %}{% set recSet = recSet.concat([v]) %}{% endif %}
    {% elseif v == true %}
      {% if recSet.indexOf('推荐') == -1 %}{% set recSet = recSet.concat(['推荐']) %}{% endif %}
    {% endif %}
  {% endif %}
{% endfor %}

<div class="page-recommend">
  <h1 class="rec-title">{{ page.title or '推荐文章' }}</h1>

  {# 2) 顶部“推荐类别”按钮（不跳转） #}
  <div class="rec-tabs">
    <button class="rec-tab is-active" data-tag="{{ ALL }}">全部</button>
    {% for t in recSet %}<button class="rec-tab" data-tag="{{ t }}">{{ t }}</button>{% endfor %}
  </div>

  {# 3) 一次性渲染所有被标记了 recommend 的文章，前端用 data-tags 过滤显示 #}
  <ul class="rec-list">
    {% for post in site.posts | sort('date','desc') %}
      {% set recVals = [] %}
      {% if post.recommend %}
        {% if post.recommend is array %}{% set recVals = post.recommend %}
        {% elseif post.recommend is string %}{% set recVals = [post.recommend] %}
        {% elseif post.recommend == true %}{% set recVals = ['推荐'] %}
        {% endif %}
      {% endif %}

      {% if recVals.length > 0 %}
        <li class="rec-item" data-tags="{{ recVals | join(',') }}">
          <a href="{{ url_for(post.path) }}">{{ post.title }}</a>
          <span class="rec-time">{{ date(post.date, 'YYYY-MM-DD') }}</span>
        </li>
      {% endif %}
    {% endfor %}
  </ul>

  {% if recSet.length == 0 %}
    <p class="rec-empty">暂无推荐文章</p>
  {% endif %}
</div>

<style>
  .page-recommend{max-width:860px;margin:0 auto;padding:1rem}
  .rec-title{font-size:1.4rem;margin:.25rem 0 1rem}
  .rec-tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0 1rem}
  .rec-tab{padding:.4rem .8rem;border:1px solid var(--accents-2,#e5e7eb);
           border-radius:999px;background:var(--body-bg,#fff);cursor:pointer}
  .rec-tab.is-active{background:var(--text,#111);color:#fff}
  .rec-list{list-style:none;margin:0;padding:0}
  .rec-item{display:flex;justify-content:space-between;gap:1rem;padding:.5rem 0;
            border-bottom:1px solid var(--accents-2,#e5e7eb)}
  .rec-item a{color:var(--link,#2563eb)}
  .rec-time{color:#888;white-space:nowrap}
  .rec-empty{color:#888;padding:1.5rem 0;text-align:center}
</style>

<script>
  (function(){
    var ALL = '{{ ALL }}';
    var tabs = [].slice.call(document.querySelectorAll('.rec-tab'));
    var items = [].slice.call(document.querySelectorAll('.rec-item'));

    function apply(tag){
      tabs.forEach(function(b){ b.classList.toggle('is-active', b.dataset.tag===tag); });
      items.forEach(function(li){
        if(tag===ALL){ li.style.display=''; return; }
        var ts = (li.dataset.tags || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        li.style.display = ts.indexOf(tag) > -1 ? '' : 'none';
      });
    }

    tabs.forEach(function(btn){ btn.addEventListener('click', function(){ apply(btn.dataset.tag); }); });
    apply(ALL); // 默认显示全部
  })();
</script>
