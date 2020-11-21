window.onload = async () => {
    let data = await d3.csv('NYPD_Hate_Crimes.csv');

    let lgbtMotives = [
        "ANTI-MALE HOMOSEXUAL(GAY)",
        "ANTI-FEMALE HOMOSEXUAL(GAY)",
        "ANTI-TRANSGENDER",
        "ANTI-LGBT(MIXED GROUP)"
    ];

    for(let i = 0; i < data.length; i++) {
        if (lgbtMotives.includes(data[i]["Bias Motive Description"])) {
            data[i]["Bias Motive Description"] = "ANTI-LGBTQ+";
        }
    }

    // let categories = d3.group(data, d => d['Offense Category']);
    // let motives = d3.group(data, d => d['Bias Motive Description']);
    // let cat = d3.rollup(data, v => v.length, d => d['Offense Category']);

    let mot = d3.rollup(data, v => v.length, d => d['Bias Motive Description']);

    let other = 0;
    let otherMotives = Array();

    mot.forEach((v, k) => {
        if (v < 10) {
            other += v;
            mot.delete(k);
            otherMotives.push(k);
        }
    })

    let stack = [...mot.entries()].sort((a, b) => b[1] - a[1]);

    stack.push(["OTHER", other]);
    mot.set("OTHER", other);

    let total = data.length;
    let value = 0;

    stack = stack.map(d => ({
        motive: d[0],
        count: d[1],
        value: d[1] / total,
        startValue: value / total,
        endValue: (value += d[1]) / total
    }));

    let width = 900;
    let barHeight = 40;
    let margin = { top: 5, bottom: 5 };

    let bar = d3.select('#barstack')
        .append('svg')
        .attr('viewBox', [0, 0, width, barHeight]);

    let colorScale = d3.scaleOrdinal()
        .domain(stack.map(d => d.motive))
        .range(d3.schemeSet3);

    let x = d3.scaleLinear([0, 1], [0, width]);
    
    bar.append('g')
        .attr('stroke', 'white')
        .selectAll('rect')
        .data(stack)
        .join('rect')
        .attr('fill', d => colorScale(d.motive))
        .attr('x', d => x(d.startValue))
        .attr('y', margin.top)
        .attr('width', d => x(d.endValue) - x(d.startValue))
        .attr('height', barHeight - margin.top - margin.bottom)
        .append('title')
        .text(d => `${d.motive} ${d.count} (${((d.endValue - d.startValue) * 100).toPrecision(3)}%)`);

    bar.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 12)
        .selectAll('text')
        .data(stack.filter(d => x(d.endValue) - x(d.startValue) > 50))
        .join('text')
        .attr('fill', 'black')
        .attr('transform', d => `translate(${x(d.startValue) + 5}, 6)`)
        .call(text => text.append('tspan')
            .attr('y', '1em')
            .attr('font-weight', 'bold')
            .text(d => d.motive))
        .call(text => text.append('tspan')
            .attr('x', 0)
            .attr('y', '2em')
            .attr('font-weight', 'bold')
            .attr('fill-opacity', 0.7)
            .text(d => `${d.count} (${((d.endValue - d.startValue) * 100).toPrecision(3)}%)`));

    let nyc = await d3.json('nyc.json');
    let boroughs = topojson.feature(nyc, nyc.objects.boroughs);
    let borders = topojson.mesh(nyc, nyc.objects.boroughs, (a, b) => a !== b);

    let map = d3.select("#nycmap")
        .append('svg')
        .attr('width', '70%')
        
    let mapWidth = map._groups[0][0].clientWidth;

    map.attr('height', mapWidth)

    let projection = d3.geoMercator().fitSize([mapWidth, mapWidth], boroughs);
    let path = d3.geoPath().projection(projection);

    map.selectAll('path')
        .data(boroughs.features)
        .enter().append('path')
        .attr('d', path)
        .attr('fill', 'lightgray');

    map.append('path')
        .datum(borders)
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 1.5)
        .attr('d', path);

    let getBoroughData = (boroughName) => {
        let boroData = data.filter(d => d["County"] === boroughName);
        let boroMotives = d3.rollup(boroData, v => v.length, d => d['Bias Motive Description']);
        let o = 0;
        let total = 0;

        boroMotives.forEach((v, k) => {
            total += v;
            if (v < 3 || k === "") {
                o += v;
                boroMotives.delete(k);
            }
        })

        let s = [...boroMotives.entries()].sort((a, b) => b[1] - a[1]);

        s.push(["OTHER", o]);

        for (let i = 0; i < s.length; i++) {
            s[i] = {
                name: s[i][0],
                number: s[i][1],
                percent: s[i][1] / total * 100
            }
        }
        
        return { data: s, total: total };
    }

    let si = getBoroughData("RICHMOND");
    let bk = getBoroughData("KINGS");
    let qn = getBoroughData("QUEENS");
    let mn = getBoroughData("NEW YORK");
    let bx = getBoroughData("BRONX");

    console.log(si, bk, qn, mn, bx);

    let mapDomain = [
        'ANTI-JEWISH',
        'ANTI-LGBTQ+',
        'ANTI-BLACK',
        'ANTI-WHITE',
        'ANTI-ASIAN',
        'ANTI-ISLAMIC(MUSLIM)',
        'ANTI-CATHOLIC',
        'ANTI-OTHER ETHNICITY',
        'OTHER',
        'ANTI-ARAB',
        'ANTI-HISPANIC',
        'ANTI-MULTI RACIAL GROUPS'
    ];

    let mapColorScale = d3.scaleOrdinal()
        .domain(mapDomain)
        .range(d3.schemeSet3);

    let pie = d3.pie()
        .padAngle(0.005)
        .value(d => d.percent);

    let drawPie = (boro, x, y) => {
        let arcs = pie(boro.data);
        let radius = (mapWidth * boro.total / total) * 0.5;
        let arc = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius - 1);

        map.selectAll('.pie')
            .data(arcs)
            .enter().append('path')
            .attr('fill', d => mapColorScale(d.data.name))
            .attr('d', arc)
            .attr('transform', `translate(${mapWidth / x}, ${mapWidth / y})`)
    }

    drawPie(bk, 1.85, 1.5);
    drawPie(si, 5, 1.25);
    drawPie(mn, 1.9, 4);
    drawPie(bx, 1.4, 7);
    drawPie(qn, 1.2, 2);

    map.selectAll('.label')
        .data(mapDomain)
        .enter().append('rect')
        .attr('x', mapWidth / 20)
        .attr('y', (d, i) => i * (mapWidth / 45) + (mapWidth / 10))
        .attr('width', mapWidth / 50)
        .attr('height', mapWidth / 50)
        .attr('fill', d => mapColorScale(d));

    map.selectAll('.labelText')
        .data(mapDomain)
        .enter().append('text')
        .attr('x', mapWidth / 12.5)
        .attr('y', (d, i) => i * (mapWidth / 45) + (mapWidth / 8.5))
        .attr('font-size', mapWidth / 50)
        .attr('font-family', 'sans-serif')
        .attr('font-weight', 'bold')
        .text(d => d)
}