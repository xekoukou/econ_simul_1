function rand(width) {
    return Math.floor(Math.random() * (width + 1));
}

function Opportunity(j , o) {
    this.jobs = rand(j) ;
    this.output = rand(o);
}

function Dept(id , amount , loan_rate) {
    this.id = id;
    this.amount = amount;
    this.loan_rate = loan_rate;
}


function Agent(id , money , nl , na) {
    // the amount of memory
    this.nl = nl;
    this.id = id;
    // the amount of money
    this.money = money;
    this.prev_prod_profit = 0;
    this.prev_loan_profit = 0;
    // The amount of money he is in debt.
    this.total_debt = 0;
    this.debts = [];
    // The amount of money he has lent to others.
    // This is to be set to zero every turn before new lending happens because we use it to
    // find the loan profitability with the current loan_rate.
    this.lent_money = 0;
    this.loans = [];
    this.prev_price_higher = 0;
    this.prev_loan_rate_higher = 0;
    // Ids of the agents that own the company.
    this.known_products = [];
    for (var i = 0; i < nl; i++) {
	this.known_products.push(rand(na));
    }
    this.known_workplaces = [];
    for (var i = 0; i < nl; i++) {
	this.known_workplaces.push(rand(na));
    }
    this.known_loan_rates = [];
    for (var i = 0; i < nl; i++) {
	this.known_loan_rates.push(rand(na));
    }
    this.opportunities = [ new Opportunity(1 , 1) ];
    this.company = this.opportunities[0];
    this.changed_op = 0;
    this.provided_wage = 1;
    this.product_price = 1;
    this.loan_rate = 1;
    this.production = 0;
    this.jobs_filled = 0;
    this.units_sold = 0;
    this.company_funded = 0;
}

function agent_the_profit(agent) {
    var op = agent.company;
    var jf = agent.jobs_filled;
    var prod = agent.production;
    return op.output * agent.product_price - op.jobs * agent.provided_wage;  
}

function agent_adapt(agent) {
    var op = agent.company;
    var jf = agent.jobs_filled;
    var prod = agent.production;
    var th_profit = op.output * agent.product_price - op.jobs * agent.provided_wage;
    var re_profit;
    if(jf == op.jobs) {
	re_profit = prod * agent.product_price - jf * agent.provided_wage;
    } else {
	re_profit = 0;
    }

    if((th_profit - op.jobs > 0) && (jf < op.jobs)) {
	agent.provided_wage++;
    }
    if((jf == op.jobs) && rand(1)) {
	agent.provided_wage--;
    }
    if ((jf == op.jobs) && (re_profit > agent.prev_prod_profit) && (agent.changed_op == 0)) {
	if (agent.prev_price_higher == 1) {
	    if (profit - prod > 0) {
		agent.product_price--;
		agent.prev_price_higher = 1;
	    }
	} else {
	    agent.product_price++;
	    agent.prev_price_higher = 0;
	}
    }
    if ((jf == op.jobs) && (re_profit < agent.prev_prod_profit) && (agent.changed_op == 0)) {
	if (agent.prev_price_higher == 1) {
	    agent.product_price++;
	    agent.prev_price_higher = 0;
	} else {
	    if (profit - prod > 0) {
		agent.product_price--;
		agent.prev_price_higher = 1;
	    }
	}
    }

    agent.prev_prod_profit = re_profit;
    agent.changed_op = 0;

    // Here we might not have enough money to lend if we decrease the rate of profit.
    // See min_money_multi.
    // Since the profits will not rise, the agent will self correct himself.
    var loan_profit = agent.lent_money * agent.loan_rate;
    if(agent.prev_loan_profit < loan_profit) {
	if(agent.prev_loan_rate_higher == 1) {
	    if(agent.loan_rate > 1){
		agent.loan_rate--;
	    }
	} else {
	    agent.loan_rate++;
	}
    } else {
	if(agent.prev_loan_rate_higher == 1) {
	    agent.loan_rate++;
	} else {
	    if(agent.loan_rate > 1){
		agent.loan_rate--;
	    }
	}
    }
}

// probability of new opportunity is 1 / op_change
function agent_learn(agent , agents , na , op_chance , jobs_width , output_width , learn_chance) {
    if(rand(op_chance - 1) == 0) {
	var nop = new Opportunity(jobs_width , output_width);
	agent.opportunities.push(nop);
    }
    if(rand(learn_chance - 1) == 0) {
	var nw = rand(na);
	var nag = agents[nw];
	for (var i = 0; i < agent.nl; i++) {
	    var other = agent.known_workplaces[i];
	    if(agents[other].provided_wage < nag.provided_wage) {
		agent.known_workplaces[i] = nw;
		nw = other;
		nag = agents[nw];
	    }
	}
	var np = rand(na);
	var nagp = agents[np];
	for (var i = 0; i < agent.nl; i++) {
	    var other = agent.known_products[i];
	    if(agents[other].product_price < nagp.product_price) {
		agent.known_products[i] = np;
		np = other;
		nagp = agents[np];
	    }
	}
	var nr = rand(na);
	var nagr = agents[nr];
	for (var i = 0; i < agent.nl; i++) {
	    var other = agent.known_loan_rates[i];
	    if(agents[other].loan_rate < nagr.loan_rate) {
		agent.known_products[i] = nr;
		nr = other;
		nagr = agents[nr];
	    }
	}
    }
}

function agent_find_cheapest (agent , agents) {
    var id = agent.known_products[0];
    var price = agents[id].product_price;
    for (var i = 1; i < agent.nl; i++) {
	var nid = agent.known_products[i];
	var nprice = agents[nid].product_price;
	var available = agents[nid].production - agents[nid].units_sold;
	if ((nprice < price) && (available > 0)) {
	    id = nid;
	    price = nprice;
	}
    }
    var available = agents[id].production - agents[id].units_sold;
    if(available > 0) {
	return id;
    } else {
	return -1;
    }
}

function agent_buy(agent , agents , cwidth) {
    var con = rand(cwidth);
    while((agent.money > 0) && (con > 0)) {
	con--;
	var id = agent_find_cheapest(agent , agents);
	if (id == -1) {
	    return;
	} else {
	    var seller = agents[id];
	    if(agent.money < seller.product_price) {
		return;
	    } else {
		agent.money = agent.money - seller.product_price;
		seller.money = seller.money + seller.product_price;
		seller.units_sold++;
	    }
	}
    }
}

// This is based on the current perception of wages and product prices of the agent.
// Thus the best option depends on the market.
function agent_pick_best_opportunity(agent) {
    var price = agent.product_price;
    var wage = agent.provided_wage;
    var op = agent.company;
    var the_profit = op.output * price - op.jobs * wage;
    for (var i = 0; i < agent.opportunities.length; i++) {
	var nop = agent.opportunities[i];
	var nprofit = nop.output * price - nop.jobs * wage;
	if (nprofit > the_profit) {
	    op = nop;
	    the_profit = nprofit;
	}
    }
    -- inequality
    if((agent.company.jobs != op.jobs) || (agent.company.output != op.output)){
	agent.company = op;
	agent.changed_op = 1;
    }
}

// The multiplier is used so as to avoid halting the operation of the company by lending money to others.
function agent_find_lower_rate (agent , money_needed , agents , min_money_multi) {
    var id = agent.known_loan_rates[0];
    var rate = agents[id].loan_rate;
    for (var i = 1; i < agent.nl; i++) {
	var nid = agent.known_loan_rates[i];
	var nrate = agents[nid].loan_rate;
	min_money = min_money_multi * (agents[nid].company.jobs * agents[nid].provided_wage);
	if ((nrate < rate) && (agents[nid].money - min_money - money_needed > 0)) {
	    id = nid;
	    rate = nrate;
	}
    }
    var min_money = min_money_multi * (agents[id].company.jobs * agents[id].provided_wage);
    if(agents[id].money - min_money - money_needed > 0) {
	return id;
    } else {
	return -1;
    }
}


// Here I assume that the lenders give money to everyone that is asking,
// and that the borrower will pay eveentually all his debt, no defaults are possible.
// This is to simplify the model.
function agent_fund_company(agent , agents , min_money_multi) {
    agent.company_funded = 0;
    if(agent.total_debt > 0) {
	return;
    }
    var req = agent.company.jobs * agent.provided_wage;
    if(agent.money >= req) {
	agent.company_funded = 1;
    } else {
	rem = agent.money - req;
	id = agent_find_lower_rate (agent , req , agents , min_money_multi);
	if(id != -1) {
	    var lender = agents[id];
            var loan = (lender.loan_rate + 100) * rem / 100
            if(agent_the_profit(agent) - loan > 0) {
		agent.company_funded = 1;
		agent.money = agent.money + rem;
		agent.total_debt = agent.total_debt + loan;
		agent.debts.push(new Dept(id , rem , lender.loan_rate));
		lender.money = lender.money - rem;
		lender.lent_money = lender.lent_money + rem;
	    }
	}
    }
}

// This should be done before consumption.
//agent.lent_money is set to zero in every cycle.
function agent_pay_debt(agent, agents) {
    while ((agent.total_debt != 0) && (agent.money > 0)) {
	var debt = agent.debts.pop();
	var lender = agents[debt.id];
        var loan = (debt.loan_rate + 100) * debt.amount / 100
	if (agent.money >= loan){
	    agent.money = agent.money - loan;
	    agent.total_debt = agent_total_debt - loan;
	    lender.money = lender.money + loan;
	} else {
	    var repaid = agent.money;
	    agent.money = 0;
	    agent.total_debt = agent_total_debt - repaid;
	    lender.money = lender.money + repaid;
	    debt.amount = debt.amount - repaid * 100 / (100 + debt.loan_rate);
	    agent.debts.push(debt);
	}
    }
}

function agent_work(agent , agents) {
    var id = agent.known_workplaces[0];
    var price = agents[id].provided_wage;
    for (var i = 1; i < agent.nl; i++) {
	var nid = agent.known_products[i];
	var nprice = agents[nid].product_price;
	var available = agents[nid].production - agents[nid].units_sold;
	if ((nprice < price) && (available > 0)) {
	    id = nid;
	    price = nprice;
	}
    }
    var available = agents[id].production - agents[id].units_sold;
    if(available > 0) {
	return id;
    } else {
	return -1;
    }
}

function agent_update(agent) {
}

function Environment(){
    var na = 1000;
    var money = 2000;
    this.na = na;
    this.agents = [];
    for (var i = 0; i < na; i++) {
	this.agents.push(new Agent(i , money));
    }
    this.s = 1;
}


function equation(t, env, graphs_all) {
    env.s = env.s + 1;
}

function Person(id, birth_year) {
    this.clone = true;
    this.x = Math.floor(Math.random() * 101);
    this.y = Math.floor(Math.random() * 101);
    this.size = 2;
    this.color = '#f00';
    this.id = "" + id;
    this.birth_year = birth_year;
    this.gender = (Math.floor(Math.random() * 2) == 1) ? "male" : "female";
    this.children = [];
    this.parents = []
    this.married = false;
    this.second_half;
}

function Env() {
    var people = [];
    people.push(new Person(1, 0));
    people.push(new Person(2, 0));
    people.push(new Person(3, 0));
    people.push(new Person(4, 0));
    people.push(new Person(5, 0));


    this.next_id = 6;
    this.people = people;
    this.not_married_male = [];
    this.not_married_female = [];
    this.married_female = [];
    this.young = people.slice();
    this.number_young = 5;
    this.number_married = 0;
    this.population = 5;
}

function population(t, values, graphs_all) {
    var not_married_male = values["not_married_male"];
    var not_married_female = values["not_married_female"];
    var married_female = values["married_female"];
    var people = values["people"];
    var young = values["young"];

 //   var graph = graphs_all["graph_id"].graph;

    //Every month, 1/100 chance to marry a woman.
    var i = 0;
    while (i < not_married_male.length) {
        var man = not_married_male[i];
        var will_be_married = (Math.floor(Math.random() * 101) == 1) ? true : false;

        if (will_be_married && not_married_female.length > 0) {
            var woman;
            var w_i = Math.floor(Math.random() * not_married_female.length - 1 + 1);
            woman = not_married_female[w_i];
            if (woman.married == true) {
                console.log("Error");
            }

            not_married_male = not_married_male.splice(i, 1);
            not_married_female = not_married_female.splice(w_i, 1);
            man.married = true;
            man.second_half = woman;
            woman.married = true;
            woman.second_half = man;
            values.number_married += 2;
            married_female.push(woman);
      //      graph.addEdge({
      //          "id": "" + values.next_id,
      //          "source": woman.id,
      //          "target": man.id
      //      });
            values.next_id++;
        } else {
            i++;
        }
    }

    //Every month, 1/1000 chance to have a child.
    for (var i = 0; i < married_female.length; i++) {
        var woman = married_female[i];

        var will_have_child = (Math.floor(Math.random() * 1001) == 1) ? true : false;
        if (will_have_child) {
            var child = new Person(values.next_id, t);
            values.next_id++;
            values.number_young++;
            people.push(child);
            young.push(child);
            child.parents.push(woman);
            child.parents.push(woman.second_half);
            woman.second_half.children.push(child);
            values.population++;
            if (woman.children.length > 0) {
                child.group = woman.children[0].group;
            } else {
                while (true) {
                    var group = Math.floor(Math.random() * 21);
                    if (group != woman.group && group != woman.second_half.group) {
                        child.group = group;
                        break;
                    }
                }
            }
            woman.children.push(child);

        //    graph.addNode(child);
        //    graph.addEdge({
        //        "id": "" + values.next_id,
        //        "source": woman.id,
        //        "target": child.id
        //    });
            values.next_id++;
        //    graph.addEdge({
        //        "id": "" + values.next_id,
        //        "source": woman.second_half.id,
        //        "target": child.id
        //    });
            values.next_id++;

        }
    }


    while (young.length > 0) {
        var person = young.shift();
        if (t - person.birth_year > 18) {
            values.number_young--;
            if (person.gender == "male") {
                not_married_male.push(person);
            } else {
                not_married_female.push(person);
            }
        } else {
            young.unshift(person);
            break;
        }
    }

}

var simulation = new Simulation(
    Environment , [
        ["time","s", "test_id", 900, 400],
        ["s","s", "test_id2", 900, 400]
    ], [
        // ["graph_id", 1200, 800, "people", null]
    ], equation , 10 , 100);
