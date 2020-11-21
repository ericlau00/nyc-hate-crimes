window.onload = async () => {
    let data = await d3.csv('NYPD_Hate_Crimes.csv');

    // let categories = d3.group(data, d => d['Offense Category']);
    // let motives = d3.group(data, d => d['Bias Motive Description']);
    // let cat = d3.rollup(data, v => v.length, d => d['Offense Category']);

    let mot = d3.rollup(data, v => v.length, d => d['Bias Motive Description']);

    let homo = mot.get("ANTI-MALE HOMOSEXUAL(GAY)") 
            + mot.get("ANTI-FEMALE HOMOSEXUAL(GAY)")
            + mot.get("ANTI-TRANSGENDER")
            + mot.get("ANTI-LGBT(MIXED GROUP)");
    mot.delete("ANTI-MALE HOMOSEXUAL(GAY)");
    mot.delete("ANTI-FEMALE HOMOSEXUAL(GAY)");
    mot.delete("ANTI-TRANSGENDER");
    mot.delete("ANTI-LGBT(MIXED GROUP)");

    mot.set("ANTI-LGBTQ+", homo);

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
            
}