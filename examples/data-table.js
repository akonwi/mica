// Application example only. Not shipped as a Mica enhancement.
const $ = (s) => document.querySelector(s), esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const names = ["Website refresh", "Mobile app", "Customer onboarding", "Autumn launch", "Design system", "Account settings", "Billing experience", "Help center", "Team directory", "Search improvements", "Analytics dashboard", "Accessibility review", "Partner portal", "Release workflow", "Content migration", "Notification center", "Reporting tools", "Workspace setup"];
let data = Array.from({ length: 54 }, (_, i) => ({ id: i + 1, name: names[i % 18] + (i >= 18 ? " · " + ["", "Phase II", "Phase III"][Math.floor(i / 18)] : ""), description: ["A clearer experience for our customers.", "Bring the team’s best ideas together.", "Make everyday work a little simpler."][i % 3], status: ["Active", "Active", "Paused", "Completed"][i % 4], owner: ["Alex Morgan", "Sam Rivera", "Jordan Lee"][i % 3], due: `2026-${String(9 + Math.floor(i / 28)).padStart(2, "0")}-${String(i % 28 + 1).padStart(2, "0")}`, tasks: 4 + i % 17, done: i % 9 }));
let page = 1, size = 10, sort = "name", descending = false, selected = new Set, view = [], filtered = [], actionId = null;
const hidden = new Set;
const date = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
function clearSelection() {
  selected.clear();
  updateSelection();
}
// Keep data behavior here in the application; the Mica module only measures overflow.
function updateSelection() {
  const n = view.filter((r) => selected.has(r.id)).length;
  $("#bulk").hidden = !n;
  $(".toolbar").inert = !!n;
  $("#selected-count").textContent = `${n} selected on this page`;
  $("#select-page").checked = !!view.length && n === view.length;
  $("#select-page").indeterminate = n > 0 && n < view.length;
  document.querySelectorAll("[data-select]").forEach((c) => {
    c.checked = selected.has(Number(c.dataset.select));
    c.closest("tr").toggleAttribute("data-selected", c.checked);
  });
}
function buttons(pages) {
  let out = `<button data-page="${page - 1}" data-focus="previous" data-variant="ghost" ${page <= 1 ? "disabled" : ""} aria-label="Previous page">← Previous</button><span class="page-status" data-page-status tabindex="-1">${pages ? `Page ${page} of ${pages}` : "No pages"}</span>`;
  const visible = [...new Set([1, pages, page - 1, page, page + 1])].filter((n) => n > 0 && n <= pages).sort((a, b) => a - b);
  let last = 0;
  for (const n of visible) {
    if (last && n - last > 1)
      out += '<span class="page-ellipsis" data-page-ellipsis aria-hidden="true">…</span>';
    out += `<button class="page-number" data-page-number data-page="${n}" data-focus="page-${n}" data-variant="ghost" aria-label="Page ${n}" ${n === page ? 'aria-current="page"' : ""}>${n}</button>`;
    last = n;
  }
  return out + `<button data-page="${page + 1}" data-focus="next" data-variant="ghost" ${page >= pages ? "disabled" : ""} aria-label="Next page">Next →</button>`;
}
// Search/filter → sort → page. Replace this local pipeline with server results as needed.
function render(restore = false, keepSelection = false) {
  const focus = restore ? document.activeElement?.dataset.focus : null;
  $("#row-actions").matches(":popover-open") && $("#row-actions").hidePopover();
  const scenario = $("#scenario").value;
  const query = $("#search").value.trim().toLowerCase();
  filtered = scenario === "empty" ? [] : data.filter((r) => (r.name + " " + r.description).toLowerCase().includes(query) && (!$("#status-filter").value || r.status === $("#status-filter").value) && (!$("#owner-filter").value || r.owner === $("#owner-filter").value));
  filtered.sort((a, b) => {
    const c = typeof a[sort] === "number" ? a[sort] - b[sort] : a[sort].localeCompare(b[sort]);
    return descending ? -c : c;
  });
  const unavailable = scenario === "loading" || scenario === "error";
  const total = unavailable ? 0 : filtered.length, pages = Math.ceil(total / size);
  page = Math.max(1, Math.min(page, pages || 1));
  view = unavailable ? [] : filtered.slice((page - 1) * size, page * size);
  if (!keepSelection)
    selected.clear();
  $("#reset").hidden = !(query || $("#status-filter").value || $("#owner-filter").value);
  const span = 7 - hidden.size;
  let html = "";
  if (scenario === "loading") {
    html = Array.from({ length: 5 }, () => `<tr aria-hidden="true"><td colspan="${span}" class="loading-cell"><m-skeleton></m-skeleton></td></tr>`).join("");
  } else if (scenario === "error") {
    html = `<tr><td colspan="${span}" class="table-empty" data-table-state><strong>We couldn’t load projects</strong><p>Your view settings are saved. Try again.</p><button data-empty-action="retry">Try again</button></td></tr>`;
  } else if (!total) {
    html = `<tr><td colspan="${span}" class="table-empty" data-table-state><strong>${scenario === "empty" ? "Your first project starts here" : "No matching projects"}</strong><p>${scenario === "empty" ? "Create a project to give your work a home." : "Try a different search or clear the filters."}</p><button data-empty-action="${scenario === "empty" ? "create" : "reset"}">${scenario === "empty" ? "Create project" : "Clear filters"}</button></td></tr>`;
  } else
    html = view.map((r) => `<tr><td class="check" data-table-sticky><input type="checkbox" data-select="${r.id}" aria-label="Select ${esc(r.name)}"></td><td class="project-cell" data-table-sticky style="--table-sticky-offset:3rem"><a href="#project-${r.id}" data-view="${r.id}">${esc(r.name)}</a><span class="project-description" data-table-description>${esc(r.description)}</span></td><td data-column="status"><span class="state" data-state="${r.status}">${r.status}</span></td><td data-column="owner">${r.owner}</td><td data-column="due"><time datetime="${r.due}">${date(r.due)}</time></td><td data-column="tasks" class="number">${Math.min(r.done, r.tasks)} / ${r.tasks}</td><td class="actions"><button data-variant="ghost" data-action="${r.id}" popovertarget="row-actions" aria-label="Actions for ${esc(r.name)}">…</button></td></tr>`).join("");
  $("#rows").innerHTML = html;
  $(".table-scroll").toggleAttribute("data-state", !view.length);
  document.querySelectorAll("[data-column]").forEach((e) => e.hidden = hidden.has(e.dataset.column));
  document.querySelectorAll("[data-sort]").forEach((b) => {
    const th = b.closest("th");
    th.removeAttribute("aria-sort");
    if (b.dataset.sort === sort)
      th.setAttribute("aria-sort", descending ? "descending" : "ascending");
    b.querySelector("span").textContent = b.dataset.sort === sort ? descending ? "↓" : "↑" : "↕";
  });
  $("#range").textContent = scenario === "loading" ? "Loading projects…" : scenario === "error" ? "Unable to load projects" : total ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total}` : "0 results";
  $("#pagination").innerHTML = buttons(pages);
  $("#select-page").disabled = !view.length;
  $("#page-size").disabled = unavailable;
  $(".table-scroll").setAttribute("aria-busy", String(scenario === "loading"));
  updateSelection();
  if (focus) {
    const e = document.querySelector(`[data-focus="${focus}"]`);
    if (e && !e.disabled && e.getClientRects().length)
      e.focus();
    else
      $("#range").setAttribute("tabindex", "-1"), $("#range").focus();
  }
}
function reset() {
  $("#search").value = "";
  $("#status-filter").value = "";
  $("#owner-filter").value = "";
  page = 1;
  render();
}
function notice(text) {
  $("#notice").textContent = text;
}
function showProject(id) {
  const r = data.find((r) => r.id === id);
  $("#dialog-title").textContent = r.name;
  $("#dialog-body").innerHTML = `<p>${esc(r.description)}</p><dl><dt>Status</dt><dd>${r.status}</dd><dt>Owner</dt><dd>${r.owner}</dd><dt>Due</dt><dd>${date(r.due)}</dd><dt>Tasks</dt><dd>${Math.min(r.done, r.tasks)} of ${r.tasks} complete</dd></dl>`;
  $("#project-dialog").showModal();
}
function create() {
  const id = Math.max(...data.map((r) => r.id)) + 1;
  data.unshift({ id, name: "Untitled project " + id, description: "Ready for your next idea.", status: "Active", owner: "Alex Morgan", due: "2026-09-30", tasks: 0, done: 0 });
  $("#scenario").value = "ready";
  reset();
  notice("Project created.");
  showProject(id);
}
$("#search").oninput = () => {
  page = 1;
  render();
};
for (const id of ["status-filter", "owner-filter"])
  $("#" + id).onchange = () => {
    page = 1;
    render();
  };
$("#reset").onclick = reset;
$("#page-size").onchange = (e) => {
  size = Number(e.target.value);
  page = 1;
  render();
};
$("#scenario").onchange = () => {
  page = 1;
  render();
};
$("#pagination").onclick = (e) => {
  const b = e.target.closest("[data-page]");
  if (!b || b.disabled)
    return;
  page = Number(b.dataset.page);
  render(true);
};
document.querySelectorAll("[data-sort]").forEach((b) => b.onclick = () => {
  descending = sort === b.dataset.sort ? !descending : false;
  sort = b.dataset.sort;
  page = 1;
  render();
});
$("#select-page").onchange = (e) => {
  selected = new Set(e.target.checked ? view.map((r) => r.id) : []);
  updateSelection();
};
$("#rows").onchange = (e) => {
  if (e.target.matches("[data-select]")) {
    const id = Number(e.target.dataset.select);
    e.target.checked ? selected.add(id) : selected.delete(id);
    updateSelection();
  }
};
$("#clear-selection").onclick = () => {
  clearSelection();
  $("#select-page").focus();
};
$("#archive-selected").onclick = () => {
  const n = selected.size;
  data.forEach((r) => {
    if (selected.has(r.id))
      r.status = "Archived";
  });
  render();
  notice(`${n} projects archived.`);
  $("#select-page").focus();
};
$("#create").onclick = create;
$("#rows").onclick = (e) => {
  const a = e.target.closest("[data-view]"), action = e.target.closest("[data-action]"), empty = e.target.closest("[data-empty-action]");
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    showProject(Number(a.dataset.view));
  }
  if (action) {
    actionId = Number(action.dataset.action);
    $("#action-title").textContent = data.find((r) => r.id === actionId).name;
    positionMenu($("#row-actions"), action);
  }
  if (empty) {
    if (empty.dataset.emptyAction === "create")
      create();
    else if (empty.dataset.emptyAction === "retry") {
      $("#scenario").value = "ready";
      render();
      $("#search").focus();
    } else {
      reset();
      $("#search").focus();
    }
  }
};
function positionMenu(menu, button) {
  const r = button.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(r.right - 224, innerWidth - 232)) + "px";
  menu.style.top = Math.max(8, Math.min(r.bottom + 4, innerHeight - 190)) + "px";
}
$("#columns-trigger").onclick = (e) => positionMenu($("#columns"), e.currentTarget);
$("#columns").onchange = (e) => {
  const name = e.target.dataset.columnToggle;
  if (!name)
    return;
  e.target.checked ? hidden.delete(name) : hidden.add(name);
  const resetSort = hidden.has(sort);
  if (resetSort) {
    sort = "name";
    descending = false;
    page = 1;
  }
  render(false, !resetSort);
};
$("#view-row").onclick = () => {
  $("#row-actions").hidePopover();
  showProject(actionId);
};
$("#archive-row").onclick = () => {
  data.find((r) => r.id === actionId).status = "Archived";
  $("#row-actions").hidePopover();
  render();
  notice("Project archived.");
  $("#search").focus();
};
$(".table-scroll").onscroll = () => {
  if ($("#row-actions").matches(":popover-open"))
    $("#row-actions").hidePopover();
};
$("#mobile").onchange = (e) => document.body.toggleAttribute("data-narrow", e.target.checked);
$("#dark").checked = matchMedia("(prefers-color-scheme:dark)").matches;
$("#dark").onchange = (e) => document.documentElement.style.colorScheme = e.target.checked ? "dark" : "light";
render();
