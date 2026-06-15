<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { AppBar, } from "@skeletonlabs/skeleton-svelte";
	import { CodeXml, Store } from "@lucide/svelte";
	import { page } from "$app/state";
    import { resolve } from "$app/paths";

	let { children } = $props();
	//let navbarVisible = $state(true);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Polonium</title>
</svelte:head>

<div class="flex flex-col w-svw h-svh">
	<AppBar>
		<AppBar.Toolbar class="grid-cols-[1fr_1fr]">
			<AppBar.Lead class="flex gap-5">
				<!--
				<button
					class="btn-icon hover:bg-primary-500"
					onclick={() => navbarVisible = !navbarVisible}
				><Menu /></button>
				-->

				<a
					class="btn hover:bg-primary-500 {page.url.pathname == resolve("/") ? "bg-surface-200 dark:bg-surface-800" : ""}"
					href={resolve("/")}
				>Home</a>

				<a
					class="btn hover:bg-primary-500 {page.url.pathname == resolve("/faq") ? "bg-surface-200 dark:bg-surface-800" : ""}"
					href={resolve("/faq")}
				>FAQ</a>

				<a
					class="btn hover:bg-primary-500 {page.url.pathname == resolve("/configuration") ? "bg-surface-200 dark:bg-surface-800" : ""}"
					href={resolve("/configuration")}
				>Configuration</a>
			</AppBar.Lead>

			<AppBar.Trail class="justify-end">
				<a
					class="btn-icon hover:bg-primary-500"
					href="https://store.kde.org/p/2140417/"
				><Store /></a>

				<a
					class="btn-icon hover:bg-primary-500"
					href="https://github.com/zeroxoneafour/polonium"
				><CodeXml /></a>
			</AppBar.Trail>
		</AppBar.Toolbar>
	</AppBar>

	<div class="flex flex-row grow">
		<!---
		{#if navbarVisible}
			<Navigation layout="sidebar"></Navigation>
		{/if}
		-->

		<div class="grow prose dark:prose-invert m-10 max-w-none">
			{@render children()}
		</div>
	</div>
</div>
