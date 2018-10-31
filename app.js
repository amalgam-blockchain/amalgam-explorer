swal.setDefaults({
	buttonsStyling: true,
	confirmButtonText: '<span class="icon-checkmark"></span> Ok',
	confirmButtonColor: '#5cb85c',
	cancelButtonText: '<span class="icon-cross"></span> Cancel',
	cancelButtonColor: '#d9534f',
});

initHtmlElements([ '#head-block-number', '#revers-blocks-count', '#main-page', '#recent-blocks-table tbody', '#about-block-page', '#about-block-code', '#about-block-table tbody', '#about-block-operations-table tbody', '#about-block-transactions-table tbody', '#reset-search-btn', '#about-account-page', '#about-account-table tbody', '#about-block-number', '#about-block-time', '#about-block-witness', '#about-block-transactions', '#about-block-operations', '.loader', '#recent-blocks-info', '#global-properties-table tbody', '#chain-properties-table tbody', '#about-account-all-count', '#about-account-count', '#about-account-filtered-count', '#auto-clear-real-time-after', '#about-account-filter', '#modal-about-block .modal-title', '#modal-about-block-operations-table tbody', '#modal-about-block-transactions-table tbody', '#modal-about-block-code', '#about-account-page-prev', '#about-account-page-next', '#about-account-page-pages', '#search', '#blockchain-version', '#witnesses-page', '#witnesses-table tbody', '#about-account-page-nav', '#change-work-real-time' ]);

let $modalGetConfig = new Modal(document.getElementById('modal-get-config'));
let $modalAboutBlock = new Modal(document.getElementById('modal-about-block'));
let $searchVal = $search.querySelector('.form-control[name="search"]');
let totalVestingShares;
let totalVestingFundAmalgam;
let currentPageNumber = 1;
let workRealTime = true;
let accountHistoryFrom = -1;
let notResultText = '-';
let transactionsAllCount = 0;

amalgam.api.getConfig((err, result) => {
	$blockchainVersion.innerText = '...';
	if ( ! err) {
		$blockchainVersion.innerText = result.AMALGAM_BLOCKCHAIN_VERSION;
		let $modalGetConfigTableTbody = document.getElementById('modal-get-config-table').querySelector('tbody');
		for (let key in result) {
			let $newRow = $modalGetConfigTableTbody.insertRow(0);
			$newRow.innerHTML = `<tr><td>${key}</td><td><b>${result[key]}</b></td></tr>`;
		}
	}
});

amalgam.api.getChainProperties((err, properties) => {
	if ( ! err) {
		for (let key in properties) {
			let prop = $chainPropertiesTableTbody.querySelector('b[data-prop="' + key + '"]');
			if (prop) prop.innerText = properties[key];
		}
                $chainPropertiesTableTbody.querySelector('b[data-prop="min_delegation"]').innerText = assetDivide(properties.account_creation_fee, 3);
	}
});

amalgam.api.getCurrentMedianHistoryPrice((err, properties) => {
	if ( ! err) {
		for (let key in properties) {
			let prop = $chainPropertiesTableTbody.querySelector('b[data-prop="' + key + '"]');
			if (prop) prop.innerText = properties[key];
		}
	}
});

$changeWorkRealTime.addEventListener('click', () => {
	if (workRealTime) {
		workRealTime = false;
		$changeWorkRealTime.innerHTML = '<span class="icon-play3"></span> Start monitoring';
		$changeWorkRealTime.className = 'btn btn-success btn-sm float-right';
	}
	else {
		workRealTime = true;
		$changeWorkRealTime.innerHTML = '<span class="icon-pause2"></span> Pause monitoring';
		$changeWorkRealTime.className = 'btn btn-secondary btn-sm float-right';
	}
});

document.getElementById('clear-real-time').addEventListener('click', () => {
	$recentBlocksTableTbody.innerHTML = '';
	swal({title: 'Table real-time blocks cleared!', type: 'success', showConfirmButton: false, position: 'top-right', toast: true, timer: 3000});
});

let operationsHandler = (transactions, templateString) => {
	let operations = {};
	let operationsCount = 0;
	transactions.forEach((transaction) => {
		transaction.operations.forEach((operation) => {
			if ( ! operations[operation[0]]) operations[operation[0]] = 0;
			operations[operation[0]]++;
			operationsCount++;
		});
	});
	return { count: operationsCount, operationsArr: operations };
}

amalgam.api.streamBlockNumber((err, lastBlock) => {
	if ( ! err) {
		amalgam.api.getBlock(lastBlock, (err, block) => {
			if (block && workRealTime) {
				let operations = operationsHandler(block.transactions);
				let operationsStr = '';
				for (let key in operations.operationsArr) {
					operationsStr += `<a class="btn btn-outline-info btn-sm" href="#operations/${lastBlock}/${key}">${key} <span class="badge badge-info">${operations.operationsArr[key]}</span></a> `;
				}
				let $newRow = $recentBlocksTableTbody.insertRow(0);
				$newRow.className = 'table-new';
				$newRow.innerHTML = `<tr>
										<td><a href="#block/${lastBlock}">${lastBlock}</a></td>
										<td>${block.timestamp}</td>
										<td><a href="#account/${block.witness}">${block.witness}</a></td>
										<td>${block.transactions.length}</td>
										<td>${operations.count}</td>
									</tr>`;
				setTimeout(() => {
					$newRow.className = 'table-success';
				}, 500);
				setTimeout(() => {
					$newRow.className = 'table-secondary';
				}, 3000);
				let $newSubRow = $recentBlocksTableTbody.insertRow(1);
				$newSubRow.className = 'table-new';
				$newSubRow.innerHTML = `<tr>${operationsStr ? `<td colspan="5">${operationsStr}</td>` : ``}</tr>`;
				setTimeout(() => {
					$newSubRow.className = 'table-success';
				}, 500);
				setTimeout(() => {
					$newSubRow.className = '';
				}, 3000);
				autoClearRealTime();
			}
			else if (err) console.error(err);
		});
	}
	
	getDynamicGlobalPropertiesHandler();
	getRewardFundHandler();
	
});

let getDynamicGlobalPropertiesHandler = () => {
	amalgam.api.getDynamicGlobalProperties((err, properties) => {
		if ( ! err) {
			totalVestingShares = properties.total_vesting_shares;
			totalVestingFundAmalgam = properties.total_vesting_fund_amalgam;
			for (let key in properties) {
				let prop = $globalPropertiesTableTbody.querySelector('b[data-prop="' + key + '"]');
				if (prop) prop.innerText = properties[key];
			}
			let reversBlockCount = properties.head_block_number - properties.last_irreversible_block_num;
			$headBlockNumber.innerText = properties.head_block_number;
			$reversBlocksCount.innerText = reversBlockCount;
		}
	});
}
getDynamicGlobalPropertiesHandler();

let getRewardFundHandler = () => {
	amalgam.api.getAccounts(['reward_fund'], (err, account) => {
		if ( ! err && account[0]) {
                    $globalPropertiesTableTbody.querySelector('b[data-prop="reward_fund_balance"]').innerText = account[0].balance;
                }
	});
}
getRewardFundHandler();

if (localStorage && localStorage.clearAfterBlocksVal) $autoClearRealTimeAfter.value = localStorage.clearAfterBlocksVal;

let autoClearRealTime = () => {
	let clearAfterBlocksVal = parseInt($autoClearRealTimeAfter.value),
		$trs = $recentBlocksTableTbody.getElementsByTagName('tr'),
		trsCount = $trs.length;
	localStorage.clearAfterBlocksVal = clearAfterBlocksVal;
	if (trsCount >= clearAfterBlocksVal * 2) {
		let removeCount = trsCount / 2 - clearAfterBlocksVal;
		for (let i = 0; i < removeCount; i++) {
			$recentBlocksTableTbody.removeChild($trs[trsCount - 1]);
			$recentBlocksTableTbody.removeChild($trs[trsCount - 2]);
			trsCount -= 2;
		}
	}
}

$autoClearRealTimeAfter.addEventListener('change', autoClearRealTime);

let getBlockFullInfo = (blockNumberVal) => {
	$aboutBlockTableTbody.innerHTML = '';
	$aboutBlockOperationsTableTbody.innerHTML = '';
	$aboutBlockTransactionsTableTbody.innerHTML = '';
	$aboutBlockCode.innerHTML = '';
	amalgam.api.getBlock(blockNumberVal, (err, block) => {
		loadingHide();
		if (block) {
			let operations = operationsHandler(block.transactions);
			let operationsStr = '';
			for (let key in operations.operationsArr) {
				operationsStr += `<a class="btn btn-outline-secondary btn-sm">${key} <span class="badge badge-secondary">${operations.operationsArr[key]}</span></a> `;
			}
			$aboutBlockNumber.innerText = blockNumberVal;
			$aboutBlockTime.innerText = block.timestamp;
			$aboutBlockWitness.innerHTML = `<a href="#account/${block.witness}">${block.witness}</a>`;
			$aboutBlockTransactions.innerText = block.transactions.length;
			$aboutBlockOperations.innerText = operations.count;

			$newRow = $aboutBlockTableTbody.insertRow();
			$newRow.innerHTML = `<tr>
									<td colspan="5"><span class="badge badge-secondary"></span> ${operationsStr}</td>
								</tr>`;

			block.transactions.forEach((transaction) => {
				transaction.operations.forEach((operation) => {
					$newRow = $aboutBlockOperationsTableTbody.insertRow();
					$newRow.innerHTML = `<tr>
											<td rowspan="${Object.keys(operation[1]).length + 1}"><b>${operation[0]}</b></td>
										</tr>`;
					for (let keyOp in operation[1]) {
						operation[1][keyOp] = filterXSS(operation[1][keyOp]);
						$newRow = $aboutBlockOperationsTableTbody.insertRow();
						$newRow.innerHTML = `<tr>
												<td>${keyOp}</td>
												<td>${operation[1][keyOp]}</td>
											</tr>`;
					}
				});
				//
				for (let keyTr in transaction) {
					if (keyTr == 'operations') transaction[keyTr] = JSON.stringify(transaction[keyTr]);
					$newRow = $aboutBlockTransactionsTableTbody.insertRow();
					$newRow.innerHTML = `<tr>
											<td><b>${keyTr}</b></td>
											<td>${transaction[keyTr]}</td>
										</tr>`;
				}
				$newRow = $aboutBlockTransactionsTableTbody.insertRow();
				$newRow.className = 'table-active';
				$newRow.innerHTML = `<tr><td colspan="2">&nbsp;</td></tr>`;
			});
			
			let blockStr = JSON.stringify(block);
			blockStr = js_beautify(blockStr);
			$aboutBlockCode.innerHTML = blockStr;
			hljs.highlightBlock($aboutBlockCode);
		}
		else {
			if ( ! err) err = 'Block not found!';
			swal({title: 'Error', type: 'error', text: err});
		}
	});
}

$search.addEventListener('submit', (e) => {
	e.preventDefault();
	loadingShow();
	$resetSearchBtn.style.display = 'block';
	$mainPage.style.display = 'none';
	$aboutBlockPage.style.display = 'none';
	$aboutAccountPage.style.display = 'none';
	$recentBlocksInfo.style.display = 'none';
	$witnessesPage.style.display = 'none';
	let searchVal = $searchVal.value;
	// get HEX
	if (searchVal.length == 40) {
		//window.location.hash = 'tx/' + searchVal;
		$aboutBlockPage.style.display = 'block';
		amalgam.api.getTransaction(searchVal, (err, result) => {
			loadingHide();
			if ( ! err) {
				getBlockFullInfo(result.block_num);
			}
			else swal({title: 'Error', type: 'error', text: err});
		});
	}
	// get block
	else if (/^-?[0-9]+$/.test(searchVal)) {
		//window.location.hash = 'block/' + searchVal;
		$aboutBlockPage.style.display = 'block';
		getBlockFullInfo(searchVal);
	}
	// get account
	else {
		//window.location.hash = 'account/' + searchVal;
		$aboutAccountPage.style.display = 'block';
		getAccountTransactions();
		getAccountInfo();
	}
	return false;
});

let getAccountInfo = () => {
	let usernameVal = $searchVal.value;
	amalgam.api.getAccounts([usernameVal], (err, account) => {
		if ( ! err && account[0]) {
			account[0].owner = account[0].owner.key_auths[0][0];
			account[0].active = account[0].active.key_auths[0][0];
			account[0].posting = account[0].posting.key_auths[0][0];
			account[0].power = amalgam.formatter.vestToAmalgam(account[0].vesting_shares, totalVestingShares, totalVestingFundAmalgam).toFixed(2);
			if (account[0].witness_votes.length == 0) account[0].witness_votes = notResultText;
			
			for (let key in account[0]) {
				let $aboutAccountPageParam = $aboutAccountPage.querySelector(`[data="${key}"]`);
				if ($aboutAccountPageParam) $aboutAccountPageParam.innerText = account[0][key];
			}
		}
	});
}

$resetSearchBtn.addEventListener('click', () => {
	$searchVal.value = '';
	$resetSearchBtn.style.display = 'none';
	$mainPage.style.display = 'flex';
	$aboutBlockPage.style.display = 'none';
	$aboutAccountPage.style.display = 'none';
	$recentBlocksInfo.style.display = 'block';
	window.location.hash = '';
});

let loadingShow = () => {
	$loader.style.display = 'block';
};
let loadingHide = () => {
	$loader.style.display = 'none';
};

let getAccountTransactions = () => {
	loadingShow();
	$aboutAccountTableTbody.innerHTML = '';
	let usernameVal = $searchVal.value;
	let operationsCount = 0;
	let limit = 99;
	console.log(accountHistoryFrom);
	if (accountHistoryFrom != -1 && accountHistoryFrom < limit) limit = accountHistoryFrom;
	amalgam.api.getAccountHistory(usernameVal, accountHistoryFrom, limit, (err, transactions) => {
		loadingHide();
		if (transactions && transactions.length > 0) {
			//transactions.reverse();
			transactions.forEach((transaction) => {
				if ( ! $aboutAccountFilter.value || (transaction[1].op[0] == $aboutAccountFilter.value)) {
					operationsCount++;
					let $newRow = $aboutAccountTableTbody.insertRow(0);
					$newRow.className = 'table-light';
					$newRow.innerHTML = `<tr>
									<td>${transaction[1].timestamp}</td>
									<td><a href="#account/${usernameVal}/${currentPageNumber}/${transaction[1].op[0]}">${transaction[1].op[0]}</a></td>
									<td><a href="#block/${transaction[1].block}">${transaction[1].block}</a></td>
									<td><a href="#tx/${transaction[1].trx_id}">${transaction[1].trx_id}</a></td>`;
					$newRow.innerHTML += `</tr>`;
					let $newSubRow = $aboutAccountTableTbody.insertRow(1);
					$newSubRow.innerHTML = `<tr><td class="description" colspan="4">${operationFormatter(transaction[1].op[1])}</td></tr>`;
					let humanDescription = operationHumanFormatter(transaction[1].op);
					if (humanDescription) {
						let $newSubSubRow = $aboutAccountTableTbody.insertRow(2);
						$newSubSubRow.innerHTML = `<tr><td class="description" colspan="4">${humanDescription}</td></tr>`;
					}
				}
			});
			if (transactions) {
				let transactionsCount = transactions.length;
				$aboutAccountAllCount.innerText = transactionsAllCount;
				$aboutAccountCount.innerText = transactionsCount;
				$aboutAccountFilteredCount.innerText = operationsCount;
				$aboutAccountPagePages.innerHTML = '';
				if (transactionsAllCount > transactionsCount) {
					// pagination
					$aboutAccountPageNav.style.display = 'block';
					pageNumber = 1;
					let renderPageNumbers = 0;
					let maxPagesCount = transactionsAllCount / 100 - 1;
					if (currentPageNumber > 25) pageNumber = currentPageNumber - 25;
					while (renderPageNumbers <= 50) {
						let $newPage = document.createElement('li');
						$newPage.innerHTML = `<a class="page-link" href="#account/${usernameVal}/${pageNumber}/${$aboutAccountFilter.value}">${pageNumber}</a>`;
						$newPage.className = 'page-item' + (pageNumber == currentPageNumber ? ' active' : '');
						$aboutAccountPagePages.appendChild($newPage);
						pageNumber++;
						renderPageNumbers++;
						if (renderPageNumbers > maxPagesCount) break;
					}
				}
			}
			if (operationsCount == 0) swal({title: 'Please change the filter of operation or change the number of page!', type: 'warning', html: `There are no <b>${$aboutAccountFilter.value}</b> operations on <u>this page</u>.`});
		}
		else {
			if ( ! err) err = 'Account not found!';
			swal({title: 'Error', type: 'error', text: err});
		}
	});
};

$aboutAccountPagePrev.addEventListener('click', (e) => {
	e.preventDefault();
	//accountHistoryFrom -= 100;
	//getAccountTransactions();
	currentPageNumber--;
	window.location.hash = `account/${$searchVal.value}/${currentPageNumber}/${$aboutAccountFilter.value}`;
});
$aboutAccountPageNext.addEventListener('click', (e) => {
	e.preventDefault();
	//accountHistoryFrom += 100;
	//getAccountTransactions();
	currentPageNumber++;
	window.location.hash = `account/${$searchVal.value}/${currentPageNumber}/${$aboutAccountFilter.value}`;
});

$aboutAccountFilter.addEventListener('change', () => {
	let usernameVal = $searchVal.value;
	window.location.hash = `account/${usernameVal}/${currentPageNumber}/${$aboutAccountFilter.value}`;
});

let getBlockInfo = (blockNumberVal, operationName, callback) => {
	loadingShow();
	$modalAboutBlockOperationsTableTbody.innerHTML = '';
	$modalAboutBlockTransactionsTableTbody.innerHTML = '';
	$modalAboutBlockCode.innerHTML = '';
	$modalAboutBlockModalTitle.innerText = `About block #${blockNumberVal}, filtered ${operationName}`;
	amalgam.api.getBlock(blockNumberVal, (err, block) => {
		loadingHide();
		if (block) {
			let blockTransactionsArr = [];

			block.transactions.forEach((transaction) => {
				transaction.operations.forEach((operation) => {
					if (operation[0] == operationName) {
						//console.log(transaction.operations);
						blockTransactionsArr.push(transaction);
						$newRow = $modalAboutBlockOperationsTableTbody.insertRow();
						$newRow.innerHTML = `<tr>
												<td rowspan="${Object.keys(operation[1]).length + 1}"><b>${operation[0]}</b></td>
											</tr>`;
						for (let keyOp in operation[1]) {
							$newRow = $modalAboutBlockOperationsTableTbody.insertRow();
							$newRow.innerHTML = `<tr>
													<td>${keyOp}</td>
													<td>${operation[1][keyOp]}</td>
												</tr>`;
						}

						for (let keyTr in transaction) {
							if (keyTr == 'operations') transaction[keyTr] = JSON.stringify(transaction[keyTr]);
							$newRow = $modalAboutBlockTransactionsTableTbody.insertRow();
							$newRow.innerHTML = `<tr>
													<td><b>${keyTr}</b></td>
													<td>${transaction[keyTr]}</td>
												</tr>`;
						}
						$newRow = $modalAboutBlockTransactionsTableTbody.insertRow();
						$newRow.className = 'table-active';
						$newRow.innerHTML = `<tr><td colspan="2">&nbsp;</td></tr>`;
					}
				});
			});
			
			block.transactions = blockTransactionsArr;
			let blockStr = JSON.stringify(block);
			blockStr = js_beautify(blockStr);
			$modalAboutBlockCode.innerHTML = blockStr;
			hljs.highlightBlock($modalAboutBlockCode);

			callback();
		}
		else {
			if ( ! err) err = 'Block not found!';
			swal({title: 'Error', type: 'error', text: err});
		}
	});
}

document.getElementById('get-config-btn').addEventListener('click', () => {
	$modalGetConfig.show();
});

let getTransactionsAllCount = (callback) => {
	amalgam.api.getAccountHistory($searchVal.value, -1, 0, (err, transactions) => {
		if (transactions && transactions.length > 0) {
			transactionsAllCount = transactions[0][0] + 1;
		}
		if (callback) callback();
	});
}

window.addEventListener('hashchange', () => {
	let hash = window.location.hash.substring(1);
	if (hash) {
		let params = hash.split('/');
		if (params[1]) {
			switch (params[0]) {
				case 'block': case 'tx': {
					$searchVal.value = params[1];
					$search.dispatchEvent(new CustomEvent('submit'));
				}; break;
				case 'account': {
					$searchVal.value = params[1];
					if (params[3]) $aboutAccountFilter.value = params[3];
					if (params[2] && params[2] > 0) {
						currentPageNumber = params[2];
						getTransactionsAllCount(() => {
							accountHistoryFrom = transactionsAllCount - (currentPageNumber * 100);
							if (currentPageNumber == 1) accountHistoryFrom = -1;
							console.log(currentPageNumber, transactionsAllCount, accountHistoryFrom);
							$search.dispatchEvent(new CustomEvent('submit'));
						});
					}
					else {
						getTransactionsAllCount();
						$search.dispatchEvent(new CustomEvent('submit'));
					}
				}; break;
				case 'operations': {
					getBlockInfo(params[1], params[2], () => {
						$modalAboutBlock.show();
					});
				}; break;
			}
		}
		else {
			switch (params[0]) {
				case 'witnesses': {
					$searchVal.value = '';
					$resetSearchBtn.style.display = 'none';
					$mainPage.style.display = 'none';
					$aboutBlockPage.style.display = 'none';
					$aboutAccountPage.style.display = 'none';
					$witnessesPage.style.display = 'block';
					$witnessesTableTbody.innerHTML = '';
					amalgam.api.getWitnessesByVote('', 100, (err, witnesses) => {
						if ( ! err) {
							let witnessRank = 0;
							let accountsArr = [];
							witnesses.forEach((witness) => {
								witnessRank++;
								accountsArr.push(witness.owner);
								let $newRow = $witnessesTableTbody.insertRow();
								const oneM = Math.pow(10, 6);
								const approval = formatDecimal(((witness.votes / oneM) / oneM).toFixed(), 0)[0];
								const percentage = (100 * (witness.votes / oneM / totalVestingShares.split(' ')[0])).toFixed(2);
								const isWitnessesDeactive = /AML1111111111111111111111111111111114T1Anm/.test(witness.signing_key);
								const noPriceFeed = /0.000 AML/.test(witness.abd_exchange_rate.base);
								if (isWitnessesDeactive || noPriceFeed) $newRow.className = 'table-danger';
								$newRow.innerHTML = `<tr>
												<td class="witness-rank">${witnessRank}</td>
												<td>
													<h3><a ${witnessRank < 20 ? ' style="font-weight: bold"' : ''} target="_blank" href="#account/${witness.owner}">${witness.owner}</a></h3>
													<!--<a class="font-weight-light text-dark witness-url" target="_blank" href="${witness.url}">witness url</a>-->
												</td>
												<td><h5><span class="badge badge-light">${approval}M</span></h5></td>
												<td><h5><span class="badge badge-primary">${percentage}%</span></h5></td>
												<td><h5><span class="badge badge-light">${witness.total_missed}</span></h5></td>
												<td><h5><a class="badge badge-success" target="_blank" href="#block/${witness.last_confirmed_block_num}">${witness.last_confirmed_block_num}</a></h5></td>
												<td>
													${witness.abd_exchange_rate.quote}
													<br>
													${witness.abd_exchange_rate.base}
													<br>
													${witness.last_abd_exchange_update}
												</td>
												<td>
													${witness.props.account_creation_fee}
													<br>
													${witness.props.abd_interest_rate / 100}%
													<br>
													${witness.props.maximum_block_size}
												</td>
												<td><h5><span class="badge badge-info">${witness.running_version}</span></h5></td>
											</tr>`;
							});
						}
						else {
							console.error(err);
							swal({title: 'Error', type: 'error', text: err});
						}
					});
				}; break;
			}
		}
	}
	else {
		$searchVal.value = '';
		$resetSearchBtn.style.display = 'none';
		$mainPage.style.display = 'flex';
		$aboutBlockPage.style.display = 'none';
		$aboutAccountPage.style.display = 'none';
		$witnessesPage.style.display = 'none';
		$recentBlocksInfo.style.display = 'block';
	}
});
window.dispatchEvent(new CustomEvent('hashchange'));